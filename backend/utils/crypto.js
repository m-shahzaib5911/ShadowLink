const crypto = require('crypto');

/**
 * Cryptographic utilities for ShadowLink backend
 * Note: Server doesn't encrypt messages (E2EE), but provides key generation
 */

/**
 * Generate a random 256-bit encryption key
 * @returns {string} Base64-encoded key
 */
function generateKey() {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Encrypt a message (for testing/development only)
 * @param {string} plaintext - Message to encrypt
 * @param {string} keyBase64 - Base64-encoded key
 * @returns {object} {message, iv, salt} all base64-encoded
 */
async function encrypt(plaintext, keyBase64) {
  await sodium.ready;

  const key = sodium.from_base64(keyBase64);
  const nonce = sodium.randombytes_buf(24); // 192-bit nonce for XChaCha20
  const messageBytes = sodium.from_string(plaintext);

  const ciphertext = sodium.crypto_secretbox_easy(messageBytes, nonce, key);

  return {
    message: sodium.to_base64(ciphertext),
    iv: sodium.to_base64(nonce),
    salt: sodium.to_base64(sodium.randombytes_buf(16)) // Random salt for future use
  };
}

/**
 * Decrypt a message (for testing/development only)
 * @param {string} encryptedMessage - Base64-encoded ciphertext
 * @param {string} ivBase64 - Base64-encoded nonce
 * @param {string} keyBase64 - Base64-encoded key
 * @returns {string} Decrypted plaintext
 */
async function decrypt(encryptedMessage, ivBase64, keyBase64) {
  await sodium.ready;

  const ciphertext = sodium.from_base64(encryptedMessage);
  const nonce = sodium.from_base64(ivBase64);
  const key = sodium.from_base64(keyBase64);

  try {
    const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
    return sodium.to_string(decrypted);
  } catch (error) {
    throw new Error('Decryption failed - invalid key or corrupted message');
  }
}

/**
 * Encode a room ID to URL-safe base64
 * @param {string} roomId - The room ID to encode
 * @returns {string} URL-safe base64 encoded room ID
 */
function encodeRoomId(roomId) {
  return Buffer.from(roomId, 'utf8').toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Decode a URL-safe base64 encoded room ID
 * @param {string} encoded - The encoded room ID
 * @returns {string|null} Decoded room ID or null if invalid
 */
function decodeRoomId(encoded) {
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    base64 += '='.repeat(padLen);
    return Buffer.from(base64, 'base64').toString('utf8');
  } catch (error) {
    return null;
  }
}

module.exports = { generateKey, encrypt, decrypt, encodeRoomId, decodeRoomId };