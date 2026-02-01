const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { rooms } = require('../utils/store');
const { generateKey } = require('../utils/crypto');
const { broadcastToRoom } = require('../utils/broadcast');
const Room = require('../models/Room');
const User = require('../models/User');
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
    const room = new Room(roomId, salt, roomName, password);

    // Add creator as first user with the actual userId
    const User = require('../models/User');
    const creator = new User(userId, roomId, null, displayName);
    room.addUser(creator);

    rooms.set(roomId, room);

    logger.info('Room created', { roomId, roomName });

    console.log('[Salt Exchange] Sending room salt to creator:', room.salt.substring(0, 10) + '...');
    res.status(201).json({
      success: true,
      room: {
        id: room.id,
        name: room.roomName,
        salt: room.salt,
        userCount: room.getUserCount(),
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
    console.log(`[Rooms] Room found for join: roomId=${room.id}, roomName=${room.roomName}`);

    // Verify password
    if (room.password !== password) {
      return res.status(403).json({ success: false, error: 'Incorrect password' });
    }

    const user = new User(userId, room.id, null, displayName);

    room.addUser(user);

    // Broadcast system message
    console.log(`[Broadcast] Sending join message for ${displayName} to room ${room.id}`);
    broadcastToRoom(room.id, { type: 'system', message: `${displayName} joined the room` });

    logger.info('User joined room', { roomId: room.id, userId, displayName });

    console.log('[Salt Exchange] Sending room salt to joiner:', room.salt.substring(0, 10) + '...');
    res.json({
      success: true,
      message: 'Joined room successfully',
      roomInfo: {
        id: room.id,
        name: room.roomName,
        salt: room.salt,
        userCount: room.getUserCount(),
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
router.get('/:roomId', verifyRoomAccess, (req, res) => {
  const room = req.room;

  // Get list of user display names
  const users = Array.from(room.users.values()).map(user => ({
    displayName: user.displayName
  }));

  res.json({
    success: true,
    room: {
      id: room.id,
      name: room.roomName,
      userCount: room.getUserCount(),
      users: users,
      messageCount: room.getMessageCount(),
      created: room.created.toISOString(),
      expiresAt: room.expiresAt.toISOString()
    }
  });
});

/**
 * POST /api/rooms/:roomId/leave
 * Leave a room
 */
router.post('/:roomId/leave', verifyRoomAccess, (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const room = req.room;

    // Get user before removing
    const user = room.users.get(userId);
    if (user) {
      // Broadcast system message
      console.log(`[Broadcast] Sending leave message for ${user.displayName} to room ${room.id}`);
      broadcastToRoom(room.id, { type: 'system', message: `${user.displayName} left the room` });
    }

    room.removeUser(userId);

    // Delete room messages and room if no users remain
    if (room.getUserCount() === 0) {
      // Clear all messages before deleting room
      room.messages = [];
      rooms.delete(room.id);
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