/**
 * ShadowLink API Client
 * Handles HTTP communication with the backend
 */

class API {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  /**
   * Make an HTTP request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} data - Request data
   * @returns {Promise<object>} Response data
   */
  async request(method, endpoint, data = null) {
    const url = this.baseURL + endpoint;
    const config = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`API ${method} ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  /**
   * POST request
   */
  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  /**
   * PUT request
   */
  async put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  // Room endpoints
  async createRoom() {
    return this.post('/api/rooms/create');
  }

  async joinRoom(roomId, userId, publicKey) {
    return this.post(`/api/rooms/${roomId}/join`, { userId, publicKey });
  }

  async getRoomInfo(roomId) {
    return this.get(`/api/rooms/${roomId}`);
  }

  async leaveRoom(roomId, userId) {
    return this.post(`/api/rooms/${roomId}/leave`, { userId });
  }

  // Message endpoints
  async sendMessage(roomId, userId, encryptedMessage, iv, salt) {
    return this.post(`/api/messages/${roomId}/send`, {
      userId,
      encryptedMessage,
      iv,
      salt
    });
  }

  async getMessages(roomId, since = null) {
    const params = since ? `?since=${encodeURIComponent(since)}` : '';
    return this.get(`/api/messages/${roomId}${params}`);
  }

  async cleanupMessages() {
    return this.post('/api/messages/cleanup');
  }

  // Relay endpoints
  async registerRelay(relayData) {
    return this.post('/api/relay/register', relayData);
  }

  async getRelays() {
    return this.get('/api/relay/list');
  }

  async getRelayStatus(relayId) {
    return this.get(`/api/relay/status/${relayId}`);
  }

  // Health check
  async healthCheck() {
    return this.get('/health');
  }
}

// Export singleton instance
const api = new API();
export default api;