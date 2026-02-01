const { rooms } = require('../utils/store');
const { decodeRoomId } = require('../utils/crypto');

/**
 * Middleware to verify room access
 * Checks if room exists and hasn't expired
 */
function verifyRoomAccess(req, res, next) {
  const encodedRoomId = req.params.roomId;
  console.log('[Auth] verifyRoomAccess: req.params.roomId:', encodedRoomId);

  if (!encodedRoomId) {
    console.log('[Auth] verifyRoomAccess: No roomId in params');
    return res.status(400).json({ success: false, error: 'Room ID required' });
  }

  // Check if encodedRoomId is a plain UUID (length 36), use directly; otherwise decode with fallback
  let roomId;
  let decodedRoomId = null;
  if (encodedRoomId.length === 36) {
    roomId = encodedRoomId;
  } else {
    decodedRoomId = decodeRoomId(encodedRoomId);
    roomId = decodedRoomId !== null ? decodedRoomId : encodedRoomId;
  }
  console.log(`[Auth] verifyRoomAccess: encoded=${encodedRoomId}, decoded=${decodedRoomId || 'N/A'}, final roomId=${roomId}, rooms count=${rooms.size}`);
  console.log(`[Auth] verifyRoomAccess: available room IDs: ${Array.from(rooms.keys()).join(', ')}`);

  if (!rooms.has(roomId)) {
    console.log(`[Auth] verifyRoomAccess: Room ${roomId} not found in rooms map`);
    return res.status(404).json({ success: false, error: 'Room not found' });
  }

  const room = rooms.get(roomId);

  if (room.isExpired()) {
    console.log(`[Auth] verifyRoomAccess: Room ${roomId} has expired`);
    rooms.delete(roomId);
    return res.status(404).json({ success: false, error: 'Room has expired' });
  }

  console.log(`[Auth] verifyRoomAccess: Room ${roomId} verified, users: ${room.getUserCount()}`);
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

  console.log(`[Auth] verifyUserAccess: userId=${userId}, roomId=${room.id}`);

  if (!userId) {
    console.log('[Auth] verifyUserAccess: No userId provided');
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  if (!room.users.has(userId)) {
    console.log(`[Auth] verifyUserAccess: User ${userId} not found in room ${room.id}, users: ${Array.from(room.users.keys()).join(', ')}`);
    return res.status(403).json({ success: false, error: 'User not in room' });
  }

  console.log(`[Auth] verifyUserAccess: User ${userId} verified in room ${room.id}`);
  req.user = room.users.get(userId);
  next();
}

module.exports = { verifyRoomAccess, verifyUserAccess };