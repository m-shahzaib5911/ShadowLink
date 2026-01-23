/**
 * ShadowLink UI Utilities
 * Handles user interface interactions and updates
 */

class UI {
  constructor() {
    this.notifications = [];
  }

  /**
   * Show a notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   * @param {number} duration - Duration in milliseconds
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        ${message}
      </div>
    `;

    const container = document.getElementById('notifications');
    container.appendChild(notification);

    // Auto-remove after duration
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, duration);

    // Allow manual dismissal
    notification.addEventListener('click', () => {
      notification.remove();
    });

    return notification;
  }

  /**
   * Update the rooms list in sidebar
   * @param {Map} rooms - Map of roomId -> room data
   * @param {string} currentRoomId - Currently active room ID
   */
  updateRoomsList(rooms, currentRoomId = null) {
    const container = document.getElementById('rooms-list');
    container.innerHTML = '';

    if (rooms.size === 0) {
      container.innerHTML = '<li>No rooms joined yet</li>';
      return;
    }

    for (const [roomId, room] of rooms) {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = '#';
      link.className = `room-item ${roomId === currentRoomId ? 'active' : ''}`;
      link.dataset.roomId = roomId;
      
      const roomName = room.name || `Room ${roomId.substring(0, 8)}`;
      const userCount = room.userCount || 0;
      
      link.innerHTML = `
        <div class="room-name">${this.escapeHtml(roomName)}</div>
        <div class="room-meta">${userCount} ${userCount === 1 ? 'user' : 'users'}</div>
      `;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.selectRoom(roomId);
      });

      li.appendChild(link);
      container.appendChild(li);
    }
  }

  /**
   * Display a message in the chat
   * @param {object} message - Message object
   * @param {boolean} isOwn - Whether this is the current user's message
   */
  displayMessage(message, isOwn = false) {
    const container = document.getElementById('messages-container');

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    messageDiv.dataset.messageId = message.id;

    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

    messageDiv.innerHTML = `
      <div class="message-content">
        ${!isOwn ? `<div class="message-author">${message.displayName || 'Unknown'}</div>` : ''}
        <div class="message-bubble">
          <div class="message-text">${this.escapeHtml(message.plaintext || message.encryptedMessage)}</div>
          <div class="message-time">${timeString}</div>
        </div>
      </div>
    `;

    container.appendChild(messageDiv);
    this.scrollToBottom();
  }

  /**
   * Clear all messages from chat
   */
  clearMessages() {
    const container = document.getElementById('messages-container');
    container.innerHTML = '';
  }

  /**
   * Update room information display
   * @param {object} roomInfo - Room information
   */
  updateRoomInfo(roomInfo) {
    const roomName = roomInfo.name || `Room ${roomInfo.id.substring(0, 8)}`;
    const userCount = roomInfo.userCount || 0;
    document.getElementById('room-title').textContent = this.escapeHtml(roomName);
    document.getElementById('room-users').textContent = `${userCount} ${userCount === 1 ? 'user' : 'users'}`;
  }

  /**
   * Show loading screen
   */
  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  /**
   * Hide loading screen
   */
  hideLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  /**
   * Show welcome screen
   */
  showWelcome() {
    document.getElementById('welcome-screen').classList.remove('hidden');
    document.getElementById('chat-container').classList.add('hidden');
  }

  /**
   * Show chat interface
   */
  showChat() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('chat-container').classList.remove('hidden');
  }

  /**
   * Show modal
   * @param {string} modalId - ID of the modal to show
   */
  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
  }

  /**
   * Hide modal
   * @param {string} modalId - ID of the modal to hide
   */
  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  /**
   * Update connection status indicator
   * @param {boolean} connected - Whether connected to server
   */
  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connection-status');
    indicator.textContent = connected ? '🟢 Online' : '🔴 Offline';
    indicator.className = `status-indicator ${connected ? 'online' : 'offline'}`;
  }

  /**
   * Scroll messages container to bottom
   */
  scrollToBottom() {
    const container = document.getElementById('messages-container');
    container.scrollTop = container.scrollHeight;
  }

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showNotification('Copied to clipboard!', 'success');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showNotification('Copied to clipboard!', 'success');
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Select a room (for mobile sidebar)
   * @param {string} roomId - Room ID to select
   */
  selectRoom(roomId) {
    // This will be handled by the main app
    const event = new CustomEvent('roomSelected', { detail: { roomId } });
    document.dispatchEvent(event);
  }

  /**
   * Toggle sidebar (for mobile)
   */
  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
  }
}

// Export singleton instance
const ui = new UI();
export default ui;