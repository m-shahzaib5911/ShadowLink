// Database-backed data store for ShadowLink
// Replaces in-memory Map with Neon Postgres queries

const { query } = require('./db');
const { v4: uuidv4 } = require('uuid');

// ==================== ROOM OPERATIONS ====================

/**
 * Create a new room in the database
 */
async function createRoom(id, salt, roomName, password, retentionSeconds) {
  const expiresAt = new Date(Date.now() + (retentionSeconds || 3600) * 1000);
  await query(
    'INSERT INTO rooms (id, salt, room_name, password, expires_at) VALUES ($1, $2, $3, $4, $5)',
    [id, salt, roomName, password, expiresAt]
  );
  return {
    id,
    salt,
    roomName,
    password,
    created: new Date(),
    expiresAt,
  };
}

/**
 * Get a room by ID (returns null if not found or expired)
 */
async function getRoom(roomId) {
  const result = await query(
    'SELECT * FROM rooms WHERE id = $1 AND expires_at > NOW()',
    [roomId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    salt: row.salt,
    roomName: row.room_name,
    password: row.password,
    created: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Delete a room (cascades to users and messages)
 */
async function deleteRoom(roomId) {
  await query('DELETE FROM rooms WHERE id = $1', [roomId]);
}

/**
 * Check if a room is expired and delete if so
 */
async function checkAndDeleteExpiredRoom(roomId) {
  const result = await query(
    'DELETE FROM rooms WHERE id = $1 AND expires_at <= NOW() RETURNING id',
    [roomId]
  );
  return result.rowCount > 0;
}

// ==================== USER OPERATIONS ====================

/**
 * Add a user to a room
 */
async function addUser(userId, roomId, displayName, publicKey = null) {
  await query(
    'INSERT INTO users (id, room_id, display_name, public_key) VALUES ($1, $2, $3, $4) ON CONFLICT (id, room_id) DO UPDATE SET display_name = $3',
    [userId, roomId, displayName, publicKey]
  );
}

/**
 * Remove a user from a room
 */
async function removeUser(userId, roomId) {
  await query('DELETE FROM users WHERE id = $1 AND room_id = $2', [userId, roomId]);
}

/**
 * Get a user from a room
 */
async function getUser(userId, roomId) {
  const result = await query(
    'SELECT * FROM users WHERE id = $1 AND room_id = $2',
    [userId, roomId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    roomId: row.room_id,
    displayName: row.display_name,
    publicKey: row.public_key,
    joinedAt: row.joined_at,
  };
}

/**
 * Get all users in a room
 */
async function getRoomUsers(roomId) {
  const result = await query(
    'SELECT * FROM users WHERE room_id = $1 ORDER BY joined_at ASC',
    [roomId]
  );
  return result.rows.map(row => ({
    id: row.id,
    roomId: row.room_id,
    displayName: row.display_name,
    publicKey: row.public_key,
    joinedAt: row.joined_at,
  }));
}

/**
 * Count users in a room
 */
async function getUserCount(roomId) {
  const result = await query(
    'SELECT COUNT(*) as count FROM users WHERE room_id = $1',
    [roomId]
  );
  return parseInt(result.rows[0].count);
}

// ==================== MESSAGE OPERATIONS ====================

/**
 * Add a message to a room
 */
async function addMessage(id, roomId, userId, displayName, encryptedMessage, iv, retentionSeconds) {
  const expiresAt = new Date(Date.now() + (retentionSeconds || 3600) * 1000);
  const timestamp = new Date();
  await query(
    'INSERT INTO messages (id, room_id, user_id, display_name, encrypted_message, iv, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [id, roomId, userId, displayName, encryptedMessage, iv, timestamp, expiresAt]
  );
  return {
    id,
    roomId,
    userId,
    displayName,
    encryptedMessage,
    iv,
    timestamp,
    expiresAt,
  };
}

/**
 * Get messages from a room (non-expired only)
 */
async function getMessages(roomId, since = null) {
  let sql = 'SELECT * FROM messages WHERE room_id = $1 AND expires_at > NOW()';
  const params = [roomId];

  if (since) {
    sql += ' AND created_at > $2';
    params.push(since);
  }

  sql += ' ORDER BY created_at ASC';
  const result = await query(sql, params);
  return result.rows.map(row => ({
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    displayName: row.display_name,
    encryptedMessage: row.encrypted_message,
    iv: row.iv,
    timestamp: row.created_at,
    expiresAt: row.expires_at,
  }));
}

/**
 * Get message count for a room
 */
async function getMessageCount(roomId) {
  const result = await query(
    'SELECT COUNT(*) as count FROM messages WHERE room_id = $1 AND expires_at > NOW()',
    [roomId]
  );
  return parseInt(result.rows[0].count);
}

// ==================== CLEANUP OPERATIONS ====================

/**
 * Clean up expired messages across all rooms
 */
async function cleanupExpiredMessages() {
  const result = await query('DELETE FROM messages WHERE expires_at <= NOW()');
  return result.rowCount;
}

/**
 * Clean up expired rooms (cascades to users and messages)
 */
async function cleanupExpiredRooms() {
  const result = await query('DELETE FROM rooms WHERE expires_at <= NOW()');
  return result.rowCount;
}

/**
 * Delete room if no users remain
 */
async function deleteRoomIfEmpty(roomId) {
  const count = await getUserCount(roomId);
  if (count === 0) {
    await deleteRoom(roomId);
    return true;
  }
  return false;
}

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
  checkAndDeleteExpiredRoom,
  addUser,
  removeUser,
  getUser,
  getRoomUsers,
  getUserCount,
  addMessage,
  getMessages,
  getMessageCount,
  cleanupExpiredMessages,
  cleanupExpiredRooms,
  deleteRoomIfEmpty,
};