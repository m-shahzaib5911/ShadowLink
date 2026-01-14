const { v4: uuidv4 } = require('uuid');

class Message {
  constructor(id = uuidv4(), roomId, userId, encryptedMessage, iv, salt) {
    this.id = id;
    this.roomId = roomId;
    this.userId = userId;
    this.encryptedMessage = encryptedMessage; // base64 encoded ciphertext
    this.iv = iv; // base64 encoded nonce
    this.salt = salt; // base64 encoded salt (for future use)
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
      encryptedMessage: this.encryptedMessage,
      iv: this.iv,
      salt: this.salt,
      timestamp: this.timestamp.toISOString(),
      expiresAt: this.expiresAt.toISOString()
    };
  }
}

module.exports = Message;