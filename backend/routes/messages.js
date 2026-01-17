const express = require('express');
const router = express.Router();

const { rooms } = require('../utils/store');
const Message = require('../models/Message');
const { verifyRoomAccess } = require('../middleware/auth');
const { validateEncryption } = require('../middleware/encryption');
const logger = require('../utils/logger');
const { broadcastToRoom } = require('../server');

/**
 * POST /api/messages/:roomId/send
 * Send an encrypted message to a room
 */
router.post('/:roomId/send', verifyRoomAccess, validateEncryption, (req, res) => {
  try {
    const { userId, encryptedMessage, iv, salt } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const room = req.room;
    const message = new Message(null, room.id, userId, encryptedMessage, iv, salt);

    room.addMessage(message);

    logger.info('Message sent', { roomId: room.id, messageId: message.id });

    // Broadcast message to all WebSocket clients in the room
    const messageData = {
      type: 'new_message',
      message: message.toJSON()
    };
    broadcastToRoom(room.id, messageData);

    res.status(201).json({
      success: true,
      message: {
        id: message.id,
        timestamp: message.timestamp.toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to send message', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * GET /api/messages/:roomId
 * Retrieve messages from a room
 */
router.get('/:roomId', verifyRoomAccess, (req, res) => {
  const room = req.room;
  const since = req.query.since ? new Date(req.query.since) : null;

  let messages = room.messages;

  if (since) {
    messages = messages.filter(msg => msg.timestamp > since);
  }

  // Return only non-expired messages
  messages = messages.filter(msg => !msg.isExpired());

  res.json({
    success: true,
    messages: messages.map(msg => msg.toJSON())
  });
});

/**
 * POST /api/messages/cleanup
 * Clean up expired messages across all rooms
 */
router.post('/cleanup', (req, res) => {
  let cleanedCount = 0;

  for (const room of rooms.values()) {
    const before = room.messages.length;
    room.messages = room.messages.filter(msg => !msg.isExpired());
    cleanedCount += before - room.messages.length;
  }

  logger.info('Messages cleaned up', { cleanedCount });

  res.json({
    success: true,
    message: `Cleaned up ${cleanedCount} expired messages`
  });
});

module.exports = router;