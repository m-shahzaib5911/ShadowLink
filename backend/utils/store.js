// In-memory data store for ShadowLink
// In production, this would be replaced with Redis or database

const rooms = new Map(); // roomId -> Room object
const users = new Map(); // userId -> User object

// Periodic cleanup of expired rooms and messages
setInterval(() => {
  const now = new Date();
  for (const [roomId, room] of rooms) {
    if (room.isExpired()) {
      rooms.delete(roomId);
      continue;
    }
    // Clean expired messages
    room.messages = room.messages.filter(msg => !msg.isExpired());
  }
}, 60000); // Clean every minute

module.exports = { rooms, users };