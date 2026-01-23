const { v4: uuidv4 } = require('uuid');

class User {
  constructor(id = uuidv4(), roomId, publicKey = null, displayName = null) {
    this.id = id;
    this.roomId = roomId;
    this.publicKey = publicKey; // For future group encryption features
    this.displayName = displayName; // Display name for the user
    this.joinedAt = new Date();
  }

  // Convert to JSON-safe format
  toJSON() {
    return {
      id: this.id,
      roomId: this.roomId,
      publicKey: this.publicKey,
      displayName: this.displayName,
      joinedAt: this.joinedAt.toISOString()
    };
  }
}

module.exports = User;