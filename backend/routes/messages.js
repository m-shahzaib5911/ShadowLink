const express = require('express');
const router = express.Router();

const { rooms } = require('../utils/store');
const Message = require('../models/Message');
const { verifyRoomAccess, verifyUserAccess } = require('../middleware/auth');
const { validateEncryption } = require('../middleware/encryption');
const logger = require('../utils/logger');
const { broadcastToRoom } = require('../utils/broadcast');

/**
 * POST /api/messages/:roomId/send
 * Send an encrypted message to a room
 */
router.post('/:roomId/send', verifyRoomAccess, verifyUserAccess, validateEncryption, (req, res) => {
  try {
    const { userId, encryptedMessage, iv } = req.body;
    const roomId = req.params.roomId;

    console.log(`[Message Send] Received request`, {roomId, userId, messageLength: encryptedMessage?.length});

    if (!userId) {
      console.log('[Message Send] Missing userId');
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const room = req.room;
    const user = req.user;
    console.log(`[Message Send] Room found, user verified`, {roomId: room.id, userCount: room.users.size, displayName: user.displayName});

    const displayName = user.displayName;
    const message = new Message(room.id, userId, encryptedMessage, iv, displayName);

    room.addMessage(message);
    console.log(`[Message Send] Message created and added`, {messageId: message.id, displayName});

    // Broadcast message to all WebSocket clients in the room
    const messageData = {
      type: 'new_message',
      message: message.toJSON()
    };
    broadcastToRoom(room.id, messageData);
    console.log(`[Message Send] Broadcasted to room`);

    res.status(201).json({
      success: true,
      message: {
        id: message.id,
        timestamp: message.timestamp.toISOString()
      }
    });
  } catch (error) {
    console.error('[Message Send] Error occurred:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

/**
 * GET /api/messages/:roomId
 * Retrieve messages from a room
 */
router.get('/:roomId', verifyRoomAccess, verifyUserAccess, (req, res) => {
  const room = req.room;
  const since = req.query.since ? new Date(req.query.since) : null;

  console.log(`[Messages] GET /:roomId: roomId=${req.params.roomId}, userId=${req.query.userId}, since=${since}, total messages=${room.messages.length}`);

  let messages = room.messages;

  if (since) {
    messages = messages.filter(msg => msg.timestamp > since);
  }

  // Return only non-expired messages
  messages = messages.filter(msg => !msg.isExpired());

  console.log(`[Messages] Returning ${messages.length} messages`);

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