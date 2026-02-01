/**
 * Encryption utilities for ShadowLink frontend
 * Uses Web Crypto API for AES-GCM encryption
 */

/**
 * Generate a random encryption key
 * @param password - User's room password
 * @param salt - Room salt from server
 * @returns CryptoKey for encryption/decryption
 */
export async function generateKey(password: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = Uint8Array.from(atob(salt), c => c.charCodeAt(0));
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a message using AES-GCM
 * @param plaintext - Message to encrypt
 * @param key - CryptoKey from generateKey
 * @returns Object with encrypted message and IV (both base64 encoded)
 */
export async function encryptMessage(plaintext: string, key: CryptoKey): Promise<{ encryptedMessage: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  // Convert to base64
  const encryptedArray = Array.from(new Uint8Array(encrypted));
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
  const ivArray = Array.from(iv);
  const ivBase64 = btoa(String.fromCharCode(...ivArray));
  
  return {
    encryptedMessage: encryptedBase64,
    iv: ivBase64
  };
}

/**
 * Decrypt a message using AES-GCM
 * @param encryptedMessage - Base64 encoded encrypted message
 * @param iv - Base64 encoded IV
 * @param key - CryptoKey from generateKey
 * @returns Decrypted plaintext
 */
export async function decryptMessage(encryptedMessage: string, iv: string, key: CryptoKey): Promise<string> {
  // Convert from base64
  const encryptedArray = Uint8Array.from(atob(encryptedMessage), c => c.charCodeAt(0));
  const ivArray = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivArray },
    key,
    encryptedArray
  );
  
  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Generate a random salt (hex format)
 */
export function generateSaltHex(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex salt to base64 (for server compatibility)
 */
export function saltHexToBase64(hexSalt: string): string {
  const bytes = Array.from(Uint8Array.from(hexSalt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))));
  return btoa(String.fromCharCode(...bytes));
}
