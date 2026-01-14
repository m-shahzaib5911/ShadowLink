const { v4: uuidv4 } = require('uuid');

class Room {
  constructor(id = uuidv4(), key = null) {
    this.id = id;
    this.key = key; // Encryption key (generated server-side, sent to clients)
    this.created = new Date();
    this.users = new Map(); // userId -> User object
    this.messages = []; // Array of Message objects
    this.expiresAt = new Date(Date.now() + (parseInt(process.env.MESSAGE_RETENTION_SECONDS) || 3600) * 1000);
  }

  // Add a user to the room
  addUser(user) {
    this.users.set(user.id, user);
  }

  // Remove a user from the room
  removeUser(userId) {
    this.users.delete(userId);
  }

  // Add a message to the room
  addMessage(message) {
    this.messages.push(message);
    // Clean up expired messages
    this.messages = this.messages.filter(msg => new Date() < msg.expiresAt);
  }

  // Get active users count
  getUserCount() {
    return this.users.size;
  }

  // Get message count
  getMessageCount() {
    return this.messages.length;
  }

  // Check if room is expired
  isExpired() {
    return new Date() > this.expiresAt;
  }
}

module.exports = Room;