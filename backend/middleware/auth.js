const { rooms } = require('../utils/store');

/**
 * Middleware to verify room access
 * Checks if room exists and hasn't expired
 */
function verifyRoomAccess(req, res, next) {
  const roomId = req.params.roomId;

  if (!roomId) {
    return res.status(400).json({ success: false, error: 'Room ID required' });
  }

  if (!rooms.has(roomId)) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }

  const room = rooms.get(roomId);

  if (room.isExpired()) {
    rooms.delete(roomId);
    return res.status(404).json({ success: false, error: 'Room has expired' });
  }

  req.room = room;
  next();
}

/**
 * Middleware to verify user access to room
 * Checks if user is in the room
 */
function verifyUserAccess(req, res, next) {
  const userId = req.body.userId || req.query.userId;
  const room = req.room;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  if (!room.users.has(userId)) {
    return res.status(403).json({ success: false, error: 'User not in room' });
  }

  req.user = room.users.get(userId);
  next();
}

module.exports = { verifyRoomAccess, verifyUserAccess };