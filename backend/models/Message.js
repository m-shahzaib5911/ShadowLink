const { v4: uuidv4 } = require('uuid');

class Message {
  constructor(roomId, userId, encryptedMessage, iv, displayName = 'Unknown') {
    this.id = uuidv4();
    this.roomId = roomId;
    this.userId = userId;
    this.displayName = displayName; // User's display name
    this.encryptedMessage = encryptedMessage; // base64 encoded ciphertext
    this.iv = iv; // base64 encoded nonce
    this.timestamp = new Date();
    this.expiresAt = new Date(Date.now() + (parseInt(process.env.MESSAGE_RETENTION_SECONDS) || 3600) * 1000);
  }

  // Check if message is expired
  isExpired() {
    return new Date() > this.expiresAt;
  }

  // Convert to JSON-safe format
  toJSON() {
    return {
      id: this.id,
      roomId: this.roomId,
      userId: this.userId,
      displayName: this.displayName,
      encryptedMessage: this.encryptedMessage,
      iv: this.iv,
      timestamp: this.timestamp.toISOString(),
      expiresAt: this.expiresAt.toISOString()
    };
  }
}

module.exports = Message;