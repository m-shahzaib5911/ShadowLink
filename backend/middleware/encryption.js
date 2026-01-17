/**
 * Middleware to validate encryption parameters
 * Ensures encrypted messages have proper format
 */
function validateEncryption(req, res, next) {
  const { encryptedMessage, iv, salt } = req.body;

  // Check required fields
  if (!encryptedMessage || !iv) {
    return res.status(400).json({
      success: false,
      error: 'Missing required encryption parameters: encryptedMessage and iv'
    });
  }

  // Validate base64 encoding
  try {
    Buffer.from(encryptedMessage, 'base64');
    Buffer.from(iv, 'base64');
    if (salt) Buffer.from(salt, 'base64');
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid base64 encoding in encryption parameters'
    });
  }

  // Validate sizes (AES-GCM specifics)
  const encryptedBuffer = Buffer.from(encryptedMessage, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');

  if (ivBuffer.length !== 12) {
    return res.status(400).json({
      success: false,
      error: 'Invalid IV size (must be 12 bytes for AES-GCM)'
    });
  }

  if (encryptedBuffer.length < 16) { // Minimum for auth tag
    return res.status(400).json({
      success: false,
      error: 'Encrypted message too small'
    });
  }

  // Check message size limits
  const maxSize = parseInt(process.env.MAX_MESSAGE_SIZE_BYTES) || 10000;
  if (encryptedBuffer.length > maxSize) {
    return res.status(400).json({
      success: false,
      error: `Message too large (max ${maxSize} bytes)`
    });
  }

  next();
}

/**
 * Middleware for decrypting messages for logging (development only)
 * In production, messages remain encrypted for privacy
 */
function decryptForLogging(req, res, next) {
  // Since this is E2EE, we cannot decrypt messages on the server
  // This middleware is for future use if we need to log decrypted content
  // (which would violate privacy principles)

  // For now, just log metadata
  if (process.env.NODE_ENV === 'development') {
    console.log(`Encrypted message received: ${req.body.encryptedMessage?.substring(0, 20)}...`);
  }

  next();
}

module.exports = { validateEncryption, decryptForLogging };