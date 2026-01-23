/**
 * ShadowLink Crypto Module
 * Handles end-to-end encryption using Web Crypto API (AES-GCM)
 */

class Crypto {
  ready = false;

  /**
   * Initialize crypto
   */
  async init() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not supported');
    }
    this.ready = true;
    console.log('Crypto initialization complete');
  }

  /**
   * Convert bytes to base64 safely
   */
  bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to bytes safely
   */
  base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Generate a random 256-bit key
   */
  async generateKey() {
    if (!this.ready) await this.init();

    const keyBytes = new Uint8Array(32);
    window.crypto.getRandomValues(keyBytes);
    return this.bytesToBase64(keyBytes);
  }

  /**
   * Encrypt a message using AES-GCM
   */
  async encryptMessage(plaintext, keyBase64) {
    if (!this.ready) await this.init();

    try {
      const keyBytes = this.base64ToBytes(keyBase64);
      const key = await window.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);

      const iv = new Uint8Array(12); // 96-bit IV for GCM
      window.crypto.getRandomValues(iv);

      const salt = new Uint8Array(16); // Random salt for future use
      window.crypto.getRandomValues(salt);

      const plaintextBytes = new TextEncoder().encode(plaintext);
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        plaintextBytes
      );

      return {
        message: this.bytesToBase64(new Uint8Array(ciphertext)),
        iv: this.bytesToBase64(iv),
        salt: this.bytesToBase64(salt)
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  /**
   * Decrypt a message using AES-GCM
   */
  async decryptMessage(encryptedMessage, ivBase64, saltBase64, keyBase64) {
    if (!this.ready) await this.init();

    try {
      const keyBytes = this.base64ToBytes(keyBase64);
      const key = await window.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);

      const ciphertext = this.base64ToBytes(encryptedMessage);
      const iv = this.base64ToBytes(ivBase64);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed - invalid key or corrupted message');
    }
  }

  /**
   * Hash a password (placeholder)
   */
  async hashPassword(password) {
    if (!this.ready) await this.init();

    // Simple hash placeholder
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash) + password.codePointAt(i);
      hash = hash & hash; // Convert to 32-bit
    }
    return btoa(Math.abs(hash).toString());
  }

  /**
   * Test crypto
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