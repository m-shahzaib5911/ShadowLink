/**
 * ShadowLink Main Application
 * Coordinates all modules and handles user interactions
 */

import crypto from './crypto.js';
import api from './api.js';
import ui from './ui.js';
import storage from './storage.js';

class ShadowLink {
  userId = null;
  currentRoomId = null;
  currentRoomKey = null;
  rooms = new Map();
  messageUpdateInterval = null;
  websocket = null;
  isInitialized = false;

  /**
   * Initialize the application
   */
  async init() {
    try {
      ui.showLoading();
      ui.showNotification('Initializing ShadowLink...', 'info');

      // Initialize crypto
      await crypto.init();

      // Generate or load user ID
      this.userId = storage.getUserId();
      if (!this.userId) {
        this.userId = this.generateUserId();
        storage.saveUserId(this.userId);
      }

      // Load joined rooms (disabled for fresh start on refresh)
      // const joinedRooms = storage.getJoinedRooms();
      // for (const roomId of joinedRooms) {
      //   const key = storage.getRoomKey(roomId);
      //   if (key) {
      //     this.rooms.set(roomId, { id: roomId, key });
      //   }
      // }

      // Set up event listeners
      this.setupEventListeners();

      // Update UI
      ui.updateRoomsList(this.rooms);
      ui.updateConnectionStatus(true);

      this.isInitialized = true;
      ui.hideLoading();

      if (this.rooms.size === 0) {
        ui.showWelcome();
      } else {
        ui.showChat();
      }

      ui.showNotification('ShadowLink ready!', 'info');
    } catch (error) {
      console.error('Initialization failed:', error);
      ui.showNotification('Failed to initialize ShadowLink', 'error');
      ui.hideLoading();
    }
  }

  /**
   * Generate a unique user ID
   */
  generateUserId() {
    return 'user_' + Math.random().toString(36).substring(2, 11);
  }

  /**
   * Set up DOM event listeners
   */
  setupEventListeners() {
    // Welcome screen buttons
    document.getElementById('welcome-create-btn').addEventListener('click', () => this.createRoom());
    document.getElementById('welcome-join-btn').addEventListener('click', () => ui.showModal('join-modal'));

    // Create room button
    document.getElementById('create-room-btn').addEventListener('click', () => this.createRoom());

    // Join room modal
    document.getElementById('join-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const roomId = document.getElementById('join-room-id').value.trim();
      const roomKey = document.getElementById('join-room-key').value.trim();
      if (roomId && roomKey) {
        this.joinRoom(roomId, roomKey);
        ui.hideModal('join-modal');
      } else {
        ui.showNotification('Please enter both Room ID and Key', 'error');
      }
    });

    // Share room
    document.getElementById('share-room-btn').addEventListener('click', () => this.shareRoom());
    document.getElementById('copy-link-btn').addEventListener('click', () => this.copyToClipboard());

    // Leave room
    document.getElementById('leave-room-btn').addEventListener('click', () => this.leaveRoom());

    // Message form
    document.getElementById('message-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        ui.hideModal(modal.id);
      });
    });

    // Room selection
    document.addEventListener('roomSelected', (e) => {
      this.selectRoom(e.detail.roomId);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
          if (!modal.classList.contains('hidden')) {
            ui.hideModal(modal.id);
          }
        });
      }
    });
  }

  /**
   * Create a new room
   */
  async createRoom() {
    try {
      ui.showNotification('Creating room...', 'info');

      const response = await api.createRoom();
      const { room } = response;

      // Store room info
      this.rooms.set(room.id, { id: room.id, key: room.key });
      storage.saveRoomKey(room.id, room.key);
      storage.addJoinedRoom(room.id);

      ui.showNotification('Room created!', 'success');
      ui.updateRoomsList(this.rooms);

      // Auto-join the created room
      await this.selectRoom(room.id);
    } catch (error) {
      console.error('Create room failed:', error);
      ui.showNotification('Failed to create room', 'error');
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomId, roomKey) {
    try {
      ui.showNotification('Joining room...', 'info');

      await api.joinRoom(roomId, this.userId);

      // Store the provided room key
      storage.saveRoomKey(roomId, roomKey);

      this.rooms.set(roomId, { id: roomId, key: roomKey });
      storage.addJoinedRoom(roomId);

      ui.showNotification('Joined room!', 'success');
      ui.updateRoomsList(this.rooms);

      await this.selectRoom(roomId);
    } catch (error) {
      console.error('Join room failed:', error);
      ui.showNotification('Failed to join room', 'error');
    }
  }

  /**
   * Select and switch to a room
   */
  async selectRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      ui.showNotification('Room not found', 'error');
      return;
    }

    // Disconnect from previous WebSocket if connected
    this.disconnectWebSocket();

    this.currentRoomId = roomId;
    this.currentRoomKey = this.rooms.get(roomId).key;

    ui.updateRoomsList(this.rooms, roomId);
    ui.showChat();

    // Load room info
    try {
      const response = await api.getRoomInfo(roomId);
      ui.updateRoomInfo(response.room);
    } catch (error) {
      console.error('Failed to load room info:', error);
    }

    // Load messages
    await this.loadMessages();

    // Connect to WebSocket for real-time updates
    this.connectWebSocket(roomId);
  }

  /**
   * Send a message
   */
  async sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();

    if (!message || !this.currentRoomId || !this.currentRoomKey) {
      return;
    }

    try {
      // Encrypt message
      const encrypted = await crypto.encryptMessage(message, this.currentRoomKey);

      // Send to server
      await api.sendMessage(this.currentRoomId, this.userId, encrypted.message, encrypted.iv, encrypted.salt);

      // Clear input
      input.value = '';

    } catch (error) {
      console.error('Send message failed:', error);
      ui.showNotification('Failed to send message', 'error');
    }
  }

  /**
   * Load messages for current room
   */
  async loadMessages() {
    if (!this.currentRoomId) return;

    try {
      const response = await api.getMessages(this.currentRoomId);
      ui.clearMessages();

      // Decrypt and display messages
      for (const msg of response.messages) {
        try {
          const plaintext = await crypto.decryptMessage(msg.encryptedMessage, msg.iv, msg.salt, this.currentRoomKey);
          const displayMessage = {
            id: msg.id,
            userId: msg.userId,
            plaintext,
            timestamp: msg.timestamp
          };
          ui.displayMessage(displayMessage, msg.userId === this.userId);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          // Display encrypted message as fallback
          ui.displayMessage({
            id: msg.id,
            userId: msg.userId,
            plaintext: '[Encrypted message]',
            timestamp: msg.timestamp
          }, msg.userId === this.userId);
        }
      }
    } catch (error) {
      console.error('Load messages failed:', error);
      ui.showNotification('Failed to load messages', 'error');
    }
  }

  /**
   * Connect to WebSocket for real-time messaging
   */
  connectWebSocket(roomId) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const protocol = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${globalThis.location.host}?roomId=${roomId}&userId=${this.userId}`;

    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      console.log('WebSocket connected');
      ui.updateConnectionStatus(true);
      // Stop polling since we have real-time updates
      this.stopMessagePolling();
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    this.websocket.onclose = () => {
      console.log('WebSocket disconnected');
      ui.updateConnectionStatus(false);
      // Fall back to polling if WebSocket disconnects
      this.startMessagePolling();
    };

    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      ui.updateConnectionStatus(false);
    };
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleWebSocketMessage(data) {
    if (data.type === 'new_message') {
      const message = data.message;

      // Only process if it's for the current room
      if (message.roomId === this.currentRoomId) {
        try {
          // Decrypt the message
          const plaintext = await crypto.decryptMessage(
            message.encryptedMessage,
            message.iv,
            message.salt,
            this.currentRoomKey
          );

          const displayMessage = {
            id: message.id,
            userId: message.userId,
            plaintext,
            timestamp: message.timestamp
          };

          // Display the message
          ui.displayMessage(displayMessage, message.userId === this.userId);

          // Add to local message cache (optional)
          // You could maintain a local cache if needed

        } catch (error) {
          console.error('Failed to decrypt WebSocket message:', error);
        }
      }
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Start polling for new messages (fallback when WebSocket unavailable)
   */
  startMessagePolling() {
    this.stopMessagePolling(); // Stop any existing polling

    this.messageUpdateInterval = setInterval(async () => {
      if (this.currentRoomId && document.visibilityState === 'visible') {
        await this.loadMessages();
      }
    }, 2000); // Poll every 2 seconds
  }

  /**
   * Stop message polling
   */
  stopMessagePolling() {
    if (this.messageUpdateInterval) {
      clearInterval(this.messageUpdateInterval);
      this.messageUpdateInterval = null;
    }
  }

  /**
   * Share current room
   */
  shareRoom() {
    if (!this.currentRoomId || !this.currentRoomKey) {
      ui.showNotification('No room to share', 'error');
      return;
    }

    // Populate share fields
    document.getElementById('share-room-id').value = this.currentRoomId;
    document.getElementById('share-room-key').value = this.currentRoomKey;

    const shareUrl = `${globalThis.location.origin}${globalThis.location.pathname}#room=${this.currentRoomId}&key=${this.currentRoomKey}`;
    document.getElementById('share-link').value = shareUrl;

    ui.showModal('share-modal');
  }

  /**
   * Copy share link to clipboard
   */
  copyToClipboard() {
    const link = document.getElementById('share-link').value;
    ui.copyToClipboard(link);
  }

  /**
   * Leave current room
   */
  async leaveRoom() {
    if (!this.currentRoomId) return;

    try {
      await api.leaveRoom(this.currentRoomId, this.userId);

      // Clean up
      this.rooms.delete(this.currentRoomId);
      storage.removeJoinedRoom(this.currentRoomId);
      this.stopMessagePolling();
      this.disconnectWebSocket();

      this.currentRoomId = null;
      this.currentRoomKey = null;

      ui.updateRoomsList(this.rooms);
      ui.showWelcome();
      ui.showNotification('Left room', 'info');
    } catch (error) {
      console.error('Leave room failed:', error);
      ui.showNotification('Failed to leave room', 'error');
    }
  }

  /**
   * Get room key from URL hash
   */
  getRoomKeyFromUrl() {
    const hash = globalThis.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get('key');
  }

  /**
   * Handle page visibility changes
   */
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // Page became visible, refresh messages
      if (this.currentRoomId) {
        this.loadMessages();
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new ShadowLink();
  window.shadowlink = app; // Make available globally for debugging

  // Handle URL hash for room joining
  const hash = globalThis.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  const roomId = params.get('room');
  const roomKey = params.get('key');

  if (roomId && roomKey) {
    // Auto-join room from URL
    app.init().then(() => {
      app.joinRoom(roomId, roomKey);
    });
  } else {
    app.init();
  }

  // Handle page visibility
  document.addEventListener('visibilitychange', () => {
    app.handleVisibilityChange();
  });
});

export default ShadowLink;