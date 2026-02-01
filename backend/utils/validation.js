/**
 * Input validation utilities for ShadowLink
 */

/**
 * Validate UUID format (v4)
 * @param {string} uuid - UUID string to validate
 * @returns {boolean} True if valid UUID v4
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate email format
 * @param {string} email - Email string to validate
 * @returns {boolean} True if valid email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate room ID
 * @param {string} roomId - Room ID to validate
 * @returns {boolean} True if valid
 */
function isValidRoomId(roomId) {
  return isValidUUID(roomId) && roomId.length === 36;
}

/**
 * Validate user ID
 * @param {string} userId - User ID to validate
 * @returns {boolean} True if valid
 */
function isValidUserId(userId) {
  return isValidUUID(userId) && userId.length === 36;
}

/**
 * Validate message content (encrypted)
 * @param {string} encryptedMessage - Base64 encrypted message
 * @returns {boolean} True if valid format
 */
function isValidEncryptedMessage(encryptedMessage) {
  if (!encryptedMessage || typeof encryptedMessage !== 'string') {
    return false;
  }

  // Check base64 format
  try {
    const buffer = Buffer.from(encryptedMessage, 'base64');
    return buffer.length > 0;
  } catch {
    return false;
  }
}

/**
 * Validate initialization vector
 * @param {string} iv - Base64 IV
 * @returns {boolean} True if valid (12 bytes for AES-GCM)
 */
function isValidIV(iv) {
  if (!iv || typeof iv !== 'string') {
    return false;
  }

  try {
    const buffer = Buffer.from(iv, 'base64');
    return buffer.length === 12; // AES-GCM uses 12-byte IV
  } catch {
    return false;
  }
}



/**
 * Validate message size
 * @param {string} encryptedMessage - Base64 message
 * @returns {boolean} True if within limits
 */
function isValidMessageSize(encryptedMessage) {
  const maxSize = parseInt(process.env.MAX_MESSAGE_SIZE_BYTES) || 10000;
  try {
    const buffer = Buffer.from(encryptedMessage, 'base64');
    return buffer.length <= maxSize;
  } catch {
    return false;
  }
}

module.exports = {
  isValidUUID,
  isValidEmail,
  isValidRoomId,
  isValidUserId,
  isValidEncryptedMessage,
  isValidIV,
  isValidMessageSize
};