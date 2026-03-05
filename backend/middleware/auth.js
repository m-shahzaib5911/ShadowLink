const store = require('../utils/store');
const { decodeRoomId } = require('../utils/crypto');

/**
 * Middleware to verify room access
 * Checks if room exists and hasn't expired
 */
async function verifyRoomAccess(req, res, next) {
  const encodedRoomId = req.params.roomId;

  if (!encodedRoomId) {
    return res.status(400).json({ success: false, error: 'Room ID required' });
  }

  // Check if encodedRoomId is a plain UUID (length 36), use directly; otherwise decode
  let roomId;
  if (encodedRoomId.length === 36) {
    roomId = encodedRoomId;
  } else {
    const decodedRoomId = decodeRoomId(encodedRoomId);
    roomId = decodedRoomId !== null ? decodedRoomId : encodedRoomId;
  }

  try {
    const room = await store.getRoom(roomId);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Room not found' });
    }

    req.room = room;
    next();
  } catch (error) {
    console.error('[Auth] Error verifying room access:', error.message);
    res.status(500).json({ success: false, error: 'Failed to verify room access' });
  }
}

/**
 * Middleware to verify user access to room
 * Checks if user is in the room
 */
async function verifyUserAccess(req, res, next) {
  const userId = req.body.userId || req.query.userId;
  const room = req.room;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  try {
    const user = await store.getUser(userId, room.id);

    if (!user) {
      return res.status(403).json({ success: false, error: 'User not in room' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth] Error verifying user access:', error.message);
    res.status(500).json({ success: false, error: 'Failed to verify user access' });
  }
}

module.exports = { verifyRoomAccess, verifyUserAccess };