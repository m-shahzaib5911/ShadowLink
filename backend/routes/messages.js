const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const store = require('../utils/store');
const { verifyRoomAccess, verifyUserAccess } = require('../middleware/auth');
const { validateEncryption } = require('../middleware/encryption');
const logger = require('../utils/logger');
const { broadcastToRoom } = require('../utils/broadcast');

/**
 * POST /api/messages/:roomId/send
 * Send an encrypted message to a room
 */
router.post('/:roomId/send', verifyRoomAccess, verifyUserAccess, validateEncryption, async (req, res) => {
  try {
    const { userId, encryptedMessage, iv } = req.body;
    const roomId = req.params.roomId;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const user = req.user;
    const displayName = user.displayName;
    const retentionSeconds = parseInt(process.env.MESSAGE_RETENTION_SECONDS) || 3600;
    const messageId = uuidv4();

    const message = await store.addMessage(messageId, roomId, userId, displayName, encryptedMessage, iv, retentionSeconds);

    // Broadcast message to all WebSocket clients in the room
    const messageData = {
      type: 'new_message',
      message: {
        id: message.id,
        roomId: message.roomId,
        userId: message.userId,
        displayName: message.displayName,
        encryptedMessage: message.encryptedMessage,
        iv: message.iv,
        timestamp: message.timestamp.toISOString(),
        expiresAt: message.expiresAt.toISOString()
      }
    };
    broadcastToRoom(roomId, messageData);

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
router.get('/:roomId', verifyRoomAccess, verifyUserAccess, async (req, res) => {
  const roomId = req.params.roomId;
  const since = req.query.since ? new Date(req.query.since) : null;

  const messages = await store.getMessages(roomId, since);

  res.json({
    success: true,
    messages: messages.map(msg => ({
      id: msg.id,
      roomId: msg.roomId,
      userId: msg.userId,
      displayName: msg.displayName,
      encryptedMessage: msg.encryptedMessage,
      iv: msg.iv,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : msg.timestamp,
      expiresAt: msg.expiresAt instanceof Date ? msg.expiresAt.toISOString() : msg.expiresAt
    }))
  });
});

/**
 * POST /api/messages/cleanup
 * Clean up expired messages across all rooms
 */
router.post('/cleanup', async (req, res) => {
  const cleanedMessages = await store.cleanupExpiredMessages();
  const cleanedRooms = await store.cleanupExpiredRooms();

  logger.info('Cleanup complete', { cleanedMessages, cleanedRooms });

  res.json({
    success: true,
    message: `Cleaned up ${cleanedMessages} expired messages and ${cleanedRooms} expired rooms`
  });
});

module.exports = router;