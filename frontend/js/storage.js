/**
 * ShadowLink Local Storage Utilities
 * Handles persistent and session storage
 */

class Storage {
  constructor() {
    this.prefix = 'shadowlink_';
  }

  /**
   * Set an item in localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.error('Storage setItem failed:', error);
    }
  }

  /**
   * Get an item from localStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Stored value or default
   */
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage getItem failed:', error);
      return defaultValue;
    }
  }

  /**
   * Remove an item from localStorage
   * @param {string} key - Storage key
   */
  removeItem(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Storage removeItem failed:', error);
    }
  }

  /**
   * Clear all ShadowLink storage
   */
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Storage clear failed:', error);
    }
  }

  /**
   * Set an item in sessionStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   */
  setSessionItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      sessionStorage.setItem(this.prefix + key, serialized);
    } catch (error) {
      console.error('Session storage setItem failed:', error);
    }
  }

  /**
   * Get an item from sessionStorage
   * @param {string} key - Storage key
   * @param {any} defaultValue - Default value if not found
   * @returns {any} Stored value or default
   */
  getSessionItem(key, defaultValue = null) {
    try {
      const item = sessionStorage.getItem(this.prefix + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Session storage getItem failed:', error);
      return defaultValue;
    }
  }

  /**
   * Remove an item from sessionStorage
   * @param {string} key - Storage key
   */
  removeSessionItem(key) {
    try {
      sessionStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.error('Session storage removeItem failed:', error);
    }
  }

  /**
   * Clear all ShadowLink session storage
   */
  clearSession() {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Session storage clear failed:', error);
    }
  }

  // Specific storage methods for ShadowLink

  /**
   * Save user ID
   * @param {string} userId - User ID to save
   */
  saveUserId(userId) {
    this.setItem('userId', userId);
  }

  /**
   * Get saved user ID
   * @returns {string|null} Saved user ID
   */
  getUserId() {
    return this.getItem('userId');
  }

  /**
   * Save room key (persisted in localStorage)
   * @param {string} roomId - Room ID
   * @param {string} key - Room encryption key
   */
  saveRoomKey(roomId, key) {
    this.setItem(`room_${roomId}_key`, key);
  }

  /**
   * Get room key
   * @param {string} roomId - Room ID
   * @returns {string|null} Room key
   */
  getRoomKey(roomId) {
    return this.getItem(`room_${roomId}_key`);
  }

  /**
   * Save user preferences
   * @param {object} preferences - User preferences
   */
  savePreferences(preferences) {
    this.setItem('preferences', preferences);
  }

  /**
   * Get user preferences
   * @returns {object} User preferences
   */
  getPreferences() {
    return this.getItem('preferences', {
      theme: 'auto',
      notifications: true,
      sound: true
    });
  }

  /**
   * Save joined rooms
   * @param {Array} rooms - List of joined room IDs
   */
  saveJoinedRooms(rooms) {
    this.setItem('joinedRooms', rooms);
  }

  /**
   * Get joined rooms
   * @returns {Array} List of joined room IDs
   */
  getJoinedRooms() {
    return this.getItem('joinedRooms', []);
  }

  /**
   * Add a joined room
   * @param {string} roomId - Room ID to add
   */
  addJoinedRoom(roomId) {
    const rooms = this.getJoinedRooms();
    if (!rooms.includes(roomId)) {
      rooms.push(roomId);
      this.saveJoinedRooms(rooms);
    }
  }

  /**
   * Remove a joined room
   * @param {string} roomId - Room ID to remove
   */
  removeJoinedRoom(roomId) {
    const rooms = this.getJoinedRooms();
    const filtered = rooms.filter(id => id !== roomId);
    this.saveJoinedRooms(filtered);
    // Also remove room key and metadata
    this.removeItem(`room_${roomId}_key`);
    this.removeItem(`room_${roomId}_metadata`);
  }

  /**
   * Save room metadata
   * @param {string} roomId - Room ID
   * @param {object} metadata - Room metadata (name, password, displayName, etc)
   */
  saveRoomMetadata(roomId, metadata) {
    this.setItem(`room_${roomId}_metadata`, metadata);
  }

  /**
   * Get room metadata
   * @param {string} roomId - Room ID
   * @returns {object|null} Room metadata
   */
  getRoomMetadata(roomId) {
    return this.getItem(`room_${roomId}_metadata`);
  }

  /**
   * Clear all joined rooms and their data
   */
  clearAllRooms() {
    const rooms = this.getJoinedRooms();
    rooms.forEach(roomId => {
      this.removeJoinedRoom(roomId);
    });
  }
}

// Export singleton instance
const storage = new Storage();
export default storage;