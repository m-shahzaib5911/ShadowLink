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
  currentRoomPassword = null;
  currentRoomName = null;
  currentDisplayName = null;
  rooms = new Map();
  messageUpdateInterval = null;
  roomInfoUpdateInterval = null;
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

      // Clear all stored rooms on refresh - no persistence
      storage.clearAllRooms();

      // Set up event listeners
      this.setupEventListeners();

      // Update UI
      ui.updateRoomsList(this.rooms);
      ui.updateConnectionStatus(true);

      this.isInitialized = true;

      // Add extra delay for loading screen on refresh
      setTimeout(async () => {
        ui.hideLoading();

        if (this.rooms.size === 0) {
          ui.showWelcome();
        } else {
          // Auto-select the first room
          const firstRoomId = this.rooms.keys().next().value;
          await this.selectRoom(firstRoomId);
        }

        ui.showNotification('ShadowLink ready!', 'info');
      }, 1000);
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
    document.getElementById('welcome-create-btn').addEventListener('click', () => this.showCreateRoomModal());
    document.getElementById('welcome-join-btn').addEventListener('click', () => ui.showModal('join-modal'));

    // Sidebar buttons
    document.getElementById('create-room-btn').addEventListener('click', () => this.showCreateRoomModal());
    document.getElementById('join-room-btn').addEventListener('click', () => {
      // Reset join form
      document.getElementById('join-room-id').value = '';
      document.getElementById('join-display-name').value = '';
      document.getElementById('join-password').value = '';
      ui.showModal('join-modal');
    });

    // Create room form
    document.getElementById('create-room-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const roomName = document.getElementById('room-name').value.trim();
      const displayName = document.getElementById('display-name').value.trim();
      const password = document.getElementById('room-password').value.trim();
      
      if (roomName && displayName && password) {
        this.createRoom(roomName, displayName, password);
        ui.hideModal('create-modal');
      } else {
        ui.showNotification('Please fill in all fields', 'error');
      }
    });

    // Join room modal
    document.getElementById('join-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const link = document.getElementById('join-room-id').value.trim();
      const displayName = document.getElementById('join-display-name').value.trim();
      const password = document.getElementById('join-password').value.trim();
      
      // Extract room ID from link format: roomId or full link
      let roomId = link;
      if (link.includes('#')) {
        const match = link.match(/room=([a-f0-9\-]+)/);
        roomId = match ? match[1] : link;
      }
      
      if (roomId && displayName && password) {
        this.joinRoom(roomId, displayName, password);
        ui.hideModal('join-modal');
      } else {
        ui.showNotification('Please fill in all fields', 'error');
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
   * Show create room modal
   */
  showCreateRoomModal() {
    // Clear previous values
    document.getElementById('room-name').value = '';
    document.getElementById('display-name').value = '';
    document.getElementById('room-password').value = '';
    ui.showModal('create-modal');
  }

  /**
   * Create a new room
   */
  async createRoom(roomName, displayName, password) {
    try {
      ui.showLoading();
      ui.showNotification('Creating room...', 'info');

      // Check if room name already exists in this browser
      for (const room of this.rooms.values()) {
        if (room.name.toLowerCase() === roomName.toLowerCase()) {
          ui.hideLoading();
          ui.showNotification(`Room "${roomName}" already exists in your sessions`, 'error');
          return;
        }
      }

      const key = await crypto.generateKey();
      const response = await api.createRoom(roomName, password, displayName, this.userId, key);
      const { room } = response;

      // Store room info
      this.rooms.set(room.id, {
        id: room.id,
        key: key,
        name: room.name,
        password: password,
        displayName: displayName,
        userCount: room.userCount
      });
      storage.saveRoomKey(room.id, room.key);
      storage.saveRoomMetadata(room.id, {
        name: room.name,
        password: password,
        displayName: displayName,
        createdAt: new Date().toISOString()
      });
      storage.addJoinedRoom(room.id);

      ui.hideLoading();
      ui.showNotification('Room created! Click Share to invite others.', 'success');
      ui.updateRoomsList(this.rooms);

      // Auto-join the created room
      await this.selectRoom(room.id);
    } catch (error) {
      console.error('Create room failed:', error);
      ui.hideLoading();
      ui.showNotification(error.message || 'Failed to create room', 'error');
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomId, displayName, password) {
    try {
      ui.showLoading();
      ui.showNotification('Joining room...', 'info');

      // Check if already in this room
      if (this.rooms.has(roomId)) {
        ui.hideLoading();
        ui.showNotification('You are already in this room', 'error');
        return;
      }

      const response = await api.joinRoom(roomId, displayName, password, this.userId);
      const { roomInfo } = response;

      // Store the room info
      this.rooms.set(roomId, {
        id: roomId,
        key: roomInfo.key,
        name: roomInfo.name,
        password: password,
        displayName: displayName,
        userCount: roomInfo.userCount
      });
      storage.saveRoomKey(roomId, roomInfo.key);
      storage.saveRoomMetadata(roomId, {
        name: roomInfo.name,
        password: password,
        displayName: displayName,
        joinedAt: new Date().toISOString()
      });
      storage.addJoinedRoom(roomId);

      ui.hideLoading();
      ui.showNotification('Joined room!', 'success');
      ui.updateRoomsList(this.rooms);

      await this.selectRoom(roomId);
    } catch (error) {
      console.error('Join room failed:', error);
      ui.hideLoading();
      ui.showNotification(error.message || 'Failed to join room', 'error');
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

    const room = this.rooms.get(roomId);
    this.currentRoomId = roomId;
    this.currentRoomKey = room.key;
    this.currentRoomPassword = room.password;
    this.currentRoomName = room.name;
    this.currentDisplayName = room.displayName;

    ui.updateRoomsList(this.rooms, roomId);
    ui.showChat();

    // Load room info
    try {
      const response = await api.getRoomInfo(roomId);
      const roomInfo = response.room;
      
      // Update stored room data with latest user count
      const storedRoom = this.rooms.get(roomId);
      storedRoom.userCount = roomInfo.userCount;
      this.rooms.set(roomId, storedRoom);
      
      // Update both header and sidebar with latest info
      ui.updateRoomInfo(roomInfo);
      ui.updateRoomsList(this.rooms, roomId);
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

    if (!message) {
      return;
    }

    if (!this.currentRoomId || !this.currentRoomKey) {
      ui.showNotification('No room selected', 'error');
      return;
    }

    try {
      console.log('Starting message encryption...', {roomId: this.currentRoomId, userId: this.userId});
      
      // Encrypt message
      const encrypted = await crypto.encryptMessage(message, this.currentRoomKey);
      console.log('Message encrypted successfully', {messageLength: encrypted.message.length, ivLength: encrypted.iv.length});

      // Send to server
      console.log('Sending message to server...', {endpoint: `/api/messages/${this.currentRoomId}/send`});
      const response = await api.sendMessage(this.currentRoomId, this.userId, encrypted.message, encrypted.iv, encrypted.salt);
      console.log('Message sent successfully', response);

      // Clear input
      input.value = '';

    } catch (error) {
      console.error('Send message failed:', error);
      console.error('Error details:', {name: error.name, message: error.message, stack: error.stack});
      ui.showNotification('Failed to send message: ' + error.message, 'error');
    }
  }

  /**
   * Load messages for current room
   */
  async loadMessages() {
    if (!this.currentRoomId) return;

    try {
      const response = await api.getMessages(this.currentRoomId, this.userId);
      ui.clearMessages();

      // Decrypt and display messages
      for (const msg of response.messages) {
        try {
          const plaintext = await crypto.decryptMessage(msg.encryptedMessage, msg.iv, msg.salt, this.currentRoomKey);
          const displayMessage = {
            id: msg.id,
            userId: msg.userId,
            displayName: msg.displayName,
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
            displayName: msg.displayName,
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
      // Stop message polling since we have real-time updates
      this.stopMessagePolling();
      // But keep room info polling for user count updates
      this.startRoomInfoPolling();
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
            userId: message.userId,            displayName: message.displayName,            plaintext,
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
    // Also stop polling intervals
    this.stopMessagePolling();
    this.stopRoomInfoPolling();
  }

  /**
   * Start polling for new messages (fallback when WebSocket unavailable)
   */
  startMessagePolling() {
    this.stopMessagePolling(); // Stop any existing polling

    this.messageUpdateInterval = setInterval(async () => {
      if (this.currentRoomId && document.visibilityState === 'visible') {
        try {
          // Load new messages
          await this.loadMessages();
          
          // Also refresh room info (for user count updates)
          const response = await api.getRoomInfo(this.currentRoomId);
          const roomInfo = response.room;
          
          // Update stored room data with latest user count
          if (this.rooms.has(this.currentRoomId)) {
            const storedRoom = this.rooms.get(this.currentRoomId);
            if (storedRoom.userCount !== roomInfo.userCount) {
              storedRoom.userCount = roomInfo.userCount;
              this.rooms.set(this.currentRoomId, storedRoom);
              
              // Update both header and sidebar with new count
              ui.updateRoomInfo(roomInfo);
              ui.updateRoomsList(this.rooms, this.currentRoomId);
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
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
   * Start polling for room info (user count updates)
   */
  startRoomInfoPolling() {
    this.stopRoomInfoPolling(); // Stop any existing polling

    this.roomInfoUpdateInterval = setInterval(async () => {
      if (this.currentRoomId && document.visibilityState === 'visible') {
        try {
          const response = await api.getRoomInfo(this.currentRoomId);
          const roomInfo = response.room;
          
          // Update stored room data with latest user count
          if (this.rooms.has(this.currentRoomId)) {
            const storedRoom = this.rooms.get(this.currentRoomId);
            if (storedRoom.userCount !== roomInfo.userCount) {
              storedRoom.userCount = roomInfo.userCount;
              this.rooms.set(this.currentRoomId, storedRoom);
              
              // Update both header and sidebar with new count
              ui.updateRoomInfo(roomInfo);
              ui.updateRoomsList(this.rooms, this.currentRoomId);
            }
          }
        } catch (error) {
          console.error('Room info polling error:', error);
        }
      }
    }, 3000); // Poll every 3 seconds
  }

  /**
   * Stop room info polling
   */
  stopRoomInfoPolling() {
    if (this.roomInfoUpdateInterval) {
      clearInterval(this.roomInfoUpdateInterval);
      this.roomInfoUpdateInterval = null;
    }
  }

  /**
   * Share current room
   */
  shareRoom() {
    if (!this.currentRoomId) {
      ui.showNotification('No room to share', 'error');
      return;
    }

    // Generate shareable link with room ID only
    const shareUrl = `${globalThis.location.origin}${globalThis.location.pathname}#room=${this.currentRoomId}`;
    document.getElementById('share-link').value = shareUrl;
    
    // Display the password
    document.getElementById('share-password').textContent = this.currentRoomPassword || 'Not set';

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

  if (roomId) {
    // Room ID in URL - user will need to fill in display name and password
    app.init().then(() => {
      // Pre-fill the join form with the room ID
      document.getElementById('join-room-id').value = roomId;
      ui.showModal('join-modal');
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