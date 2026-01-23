const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const { rooms } = require('../utils/store');
const { generateKey } = require('../utils/crypto');
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
    const { roomName, password, displayName, userId, key } = req.body;

    if (!roomName || !password || !key) {
      return res.status(400).json({ success: false, error: 'Room name, password, and key required' });
    }

    // Check if a room with the same name already exists
    let duplicateRoom = null;
    for (const room of rooms.values()) {
      if (room.roomName.toLowerCase() === roomName.toLowerCase()) {
        duplicateRoom = room;
        break;
      }
    }

    if (duplicateRoom) {
      return res.status(409).json({ 
        success: false, 
        error: `Room "${roomName}" already exists. Please choose a different name.` 
      });
    }

    const roomId = uuidv4();
    const room = new Room(roomId, key, roomName, password);

    // Add creator as first user with the actual userId
    const User = require('../models/User');
    const creator = new User(userId, roomId, null, displayName);
    room.addUser(creator);

    rooms.set(roomId, room);

    logger.info('Room created', { roomId, roomName });

    res.status(201).json({
      success: true,
      room: {
        id: room.id,
        name: room.roomName,
        key: room.key,
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

    if (!userId || !password || !displayName) {
      return res.status(400).json({ success: false, error: 'User ID, password, and display name required' });
    }

    const room = req.room;

    // Verify password
    if (room.password !== password) {
      return res.status(403).json({ success: false, error: 'Incorrect password' });
    }

    const user = new User(userId, room.id, null, displayName);

    room.addUser(user);

    logger.info('User joined room', { roomId: room.id, userId, displayName });

    res.json({
      success: true,
      message: 'Joined room successfully',
      roomInfo: {
        id: room.id,
        name: room.roomName,
        key: room.key,
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

  res.json({
    success: true,
    room: {
      id: room.id,
      name: room.roomName,
      userCount: room.getUserCount(),
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
    room.removeUser(userId);

    logger.info('User left room', { roomId: room.id, userId });

    res.json({ success: true, message: 'Left room successfully' });
  } catch (error) {
    logger.error('Failed to leave room', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to leave room' });
  }
});

module.exports = router;