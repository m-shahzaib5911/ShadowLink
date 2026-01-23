/**
 * ShadowLink API Client
 * Handles HTTP communication with the backend
 */

class API {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

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
      console.log(`[API] ${method.toUpperCase()} ${url}`, data);
      const response = await fetch(url, config);
      const result = await response.json();

      console.log(`[API] Response Status: ${response.status}`, result);

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`[API] ${method} ${endpoint} failed:`, error);
      throw error;
    }
  }

  async get(endpoint) {
    return this.request('GET', endpoint);
  }

  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  async put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

 // api.js (MODIFIED PARTS ONLY)

async createRoom(roomName, password, displayName, userId, key) {
  return this.post('/api/rooms/create', { roomName, password, displayName, userId, key });
}

async joinRoom(roomId, displayName, password, userId) {
  return this.post(`/api/rooms/${roomId}/join`, {
    userId,
    displayName,
    password
  });
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

  async getMessages(roomId, userId, since = null) {
    const params = `?userId=${encodeURIComponent(userId)}${since ? `&since=${encodeURIComponent(since)}` : ''}`;
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

const api = new API();
export default api;