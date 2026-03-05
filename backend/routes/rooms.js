const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const store = require('../utils/store');
const { broadcastToRoom } = require('../utils/broadcast');
const { verifyRoomAccess } = require('../middleware/auth');
const logger = require('../utils/logger');

/**
 * POST /api/rooms/create
 * Create a new chat room
 */
router.post('/create', async (req, res) => {
  try {
    const { roomName, password, displayName, userId, salt } = req.body;

    if (!roomName || !password || !salt) {
      return res.status(400).json({ success: false, error: 'Room name, password, and salt required' });
    }

    const roomId = uuidv4();
    const retentionSeconds = parseInt(process.env.MESSAGE_RETENTION_SECONDS) || 3600;
    const room = await store.createRoom(roomId, salt, roomName, password, retentionSeconds);

    // Add creator as first user
    await store.addUser(userId, roomId, displayName);

    logger.info('Room created', { roomId, roomName });

    console.log('[Salt Exchange] Sending room salt to creator:', room.salt.substring(0, 10) + '...');
    res.status(201).json({
      success: true,
      room: {
        id: room.id,
        name: room.roomName,
        salt: room.salt,
        userCount: 1,
        created: room.created.toISOString(),
        expiresAt: room.expiresAt.toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to create room', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to create room' });
  }
});

/**
 * POST /api/rooms/:roomId/join
 * Join an existing room
 */
router.post('/:roomId/join', verifyRoomAccess, async (req, res) => {
  try {
    const { userId, password, displayName } = req.body;
    console.log(`[Rooms] Join attempt: roomId=${req.params.roomId}, userId=${userId}, displayName=${displayName}`);

    if (!userId || !password || !displayName) {
      return res.status(400).json({ success: false, error: 'User ID, password, and display name required' });
    }

    const room = req.room;

    // Verify password
    if (room.password !== password) {
      return res.status(403).json({ success: false, error: 'Incorrect password' });
    }

    await store.addUser(userId, room.id, displayName);

    // Broadcast system message
    broadcastToRoom(room.id, { type: 'system', message: `${displayName} joined the room` });

    logger.info('User joined room', { roomId: room.id, userId, displayName });

    const userCount = await store.getUserCount(room.id);

    console.log('[Salt Exchange] Sending room salt to joiner:', room.salt.substring(0, 10) + '...');
    res.json({
      success: true,
      message: 'Joined room successfully',
      roomInfo: {
        id: room.id,
        name: room.roomName,
        salt: room.salt,
        userCount,
        created: room.created.toISOString(),
        expiresAt: room.expiresAt.toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to join room', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to join room' });
  }
});

/**
 * GET /api/rooms/:roomId
 * Get room information
 */
router.get('/:roomId', verifyRoomAccess, async (req, res) => {
  const room = req.room;

  const users = await store.getRoomUsers(room.id);
  const userCount = users.length;
  const messageCount = await store.getMessageCount(room.id);

  res.json({
    success: true,
    room: {
      id: room.id,
      name: room.roomName,
      userCount,
      users: users.map(u => ({ displayName: u.displayName })),
      messageCount,
      created: room.created.toISOString(),
      expiresAt: room.expiresAt.toISOString()
    }
  });
});

/**
 * POST /api/rooms/:roomId/leave
 * Leave a room
 */
router.post('/:roomId/leave', verifyRoomAccess, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const room = req.room;

    // Get user before removing
    const user = await store.getUser(userId, room.id);
    if (user) {
      broadcastToRoom(room.id, { type: 'system', message: `${user.displayName} left the room` });
    }

    await store.removeUser(userId, room.id);

    // Delete room if no users remain
    const deleted = await store.deleteRoomIfEmpty(room.id);
    if (deleted) {
      logger.info('Room deleted - no users remaining', { roomId: room.id });
    }

    logger.info('User left room', { roomId: room.id, userId });

    res.json({ success: true, message: 'Left room successfully' });
  } catch (error) {
    logger.error('Failed to leave room', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to leave room' });
  }
});

module.exports = router;