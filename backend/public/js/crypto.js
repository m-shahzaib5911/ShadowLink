/**
 * ShadowLink Crypto Module
 * Handles end-to-end encryption using libsodium.js
 */

class Crypto {
  constructor() {
    this.ready = false;
    this.sodium = null;
  }

  /**
   * Initialize libsodium
   */
  async init() {
    if (typeof sodium === 'undefined') {
      throw new Error('libsodium.js not loaded');
    }

    await sodium.ready;
    this.sodium = sodium;
    this.ready = true;
  }

  /**
   * Generate a random 256-bit encryption key
   */
  async generateKey() {
    if (!this.ready) await this.init();

    const key = this.sodium.randombytes_buf(32);
    return this.sodium.to_base64(key);
  }

  /**
   * Encrypt a message
   * @param {string} plaintext - Message to encrypt
   * @param {string} keyBase64 - Base64-encoded key
   * @returns {object} {message, iv, salt} all base64-encoded
   */
  async encryptMessage(plaintext, keyBase64) {
    if (!this.ready) await this.init();

    const key = this.sodium.from_base64(keyBase64);
    const nonce = this.sodium.randombytes_buf(24); // 192-bit nonce for XChaCha20
    const messageBytes = this.sodium.from_string(plaintext);

    const ciphertext = this.sodium.crypto_secretbox_easy(messageBytes, nonce, key);

    return {
      message: this.sodium.to_base64(ciphertext),
      iv: this.sodium.to_base64(nonce),
      salt: this.sodium.to_base64(this.sodium.randombytes_buf(16)) // Random salt
    };
  }

  /**
   * Decrypt a message
   * @param {string} encryptedMessage - Base64 ciphertext
   * @param {string} ivBase64 - Base64 nonce
   * @param {string} saltBase64 - Base64 salt (unused for now)
   * @param {string} keyBase64 - Base64 key
   * @returns {string} Decrypted plaintext
   */
  async decryptMessage(encryptedMessage, ivBase64, saltBase64, keyBase64) {
    if (!this.ready) await this.init();

    const ciphertext = this.sodium.from_base64(encryptedMessage);
    const nonce = this.sodium.from_base64(ivBase64);
    const key = this.sodium.from_base64(keyBase64);

    try {
      const decrypted = this.sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
      return this.sodium.to_string(decrypted);
    } catch (error) {
      throw new Error('Decryption failed - invalid key or corrupted message');
    }
  }

  /**
   * Hash a password (for future use)
   * @param {string} password - Password to hash
   * @returns {string} Hashed password
   */
  async hashPassword(password) {
    if (!this.ready) await this.init();

    const passwordBytes = this.sodium.from_string(password);
    const hash = this.sodium.crypto_generichash(32, passwordBytes);
    return this.sodium.to_base64(hash);
  }

  /**
   * Verify if libsodium is working
   */
  async test() {
    if (!this.ready) await this.init();

    const testMessage = 'Hello, ShadowLink!';
    const key = await this.generateKey();
    const encrypted = await this.encryptMessage(testMessage, key);
    const decrypted = await this.decryptMessage(encrypted.message, encrypted.iv, encrypted.salt, key);

    return decrypted === testMessage;
  }
}

// Export singleton instance
const crypto = new Crypto();
export default crypto;