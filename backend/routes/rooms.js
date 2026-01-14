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
    const roomId = uuidv4();
    const key = await generateKey();
    const room = new Room(roomId, key);

    rooms.set(roomId, room);

    logger.info('Room created', { roomId });

    res.status(201).json({
      success: true,
      room: {
        id: room.id,
        key: room.key,
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
    const { userId, publicKey } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const room = req.room;
    const user = new User(userId, room.id, publicKey);

    room.addUser(user);

    logger.info('User joined room', { roomId: room.id, userId });

    res.json({
      success: true,
      message: 'Joined room successfully',
      roomInfo: {
        id: room.id,
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