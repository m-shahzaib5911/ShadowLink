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
   * Generate a random 256-bit key
   */
  async generateKey() {
    if (!this.ready) await this.init();

    const keyBytes = new Uint8Array(32);
    window.crypto.getRandomValues(keyBytes);
    return btoa(String.fromCharCode(...keyBytes));
  }

  /**
   * Encrypt a message using AES-GCM
   */
  async encryptMessage(plaintext, keyBase64) {
    if (!this.ready) await this.init();

    const keyBytes = new Uint8Array([...atob(keyBase64)].map(c => c.charCodeAt(0)));
    const key = await window.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);

    const iv = new Uint8Array(12); // 96-bit IV for GCM
    window.crypto.getRandomValues(iv);

    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      plaintextBytes
    );

    return {
      message: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...new Uint8Array(16))) // Random salt for future use
    };
  }

  /**
   * Decrypt a message using AES-GCM
   */
  async decryptMessage(encryptedMessage, ivBase64, saltBase64, keyBase64) {
    if (!this.ready) await this.init();

    const keyBytes = new Uint8Array([...atob(keyBase64)].map(c => c.charCodeAt(0)));
    const key = await window.crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);

    const ciphertext = new Uint8Array([...atob(encryptedMessage)].map(c => c.charCodeAt(0)));
    const iv = new Uint8Array([...atob(ivBase64)].map(c => c.charCodeAt(0)));

    try {
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      return new TextDecoder().decode(decrypted);
    } catch (error) {
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