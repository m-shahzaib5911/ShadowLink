// Use current origin for API base URL (works in dev and production)
const getApiBaseUrl = (): string => {
  const origin = window.location.origin;
  // If running on same port, no /api suffix needed (backend serves API)
  // Otherwise, append /api for separate backend
  return origin;
};

const API_BASE_URL = getApiBaseUrl();

// Generate a random salt
const generateSalt = (): string => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Room API
interface Room {
  id: string;
  name: string;
  salt: string;
  userCount: number;
  created: string;
  expiresAt: string;
}

interface RoomInfo {
  id: string;
  name: string;
  salt: string;
  userCount: number;
  created: string;
  expiresAt: string;
}

interface UserRoom {
  roomId: string;
  roomName: string;
  password: string;
  displayName: string;
  salt: string;
}

// Message API
interface Message {
  id: string;
  roomId: string;
  userId: string;
  encryptedMessage: string;
  iv: string;
  displayName: string;
  timestamp: string;
}

// User API
// User API
interface User {
  id: string;
  displayName: string;
}

// Create a new room
export const createRoom = async (roomName: string, password: string, displayName: string, userId?: string): Promise<Room> => {
  try {
    const salt = generateSalt();
    const response = await fetch(`${API_BASE_URL}/rooms/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomName,
        password,
        displayName,
        userId: userId || generateUserId(),
        salt,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create room');
    }

    const data = await response.json();
    return data.room;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

// Join a room
export const joinRoom = async (roomId: string, password: string, displayName: string, userId?: string): Promise<RoomInfo> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId || generateUserId(),
        password,
        displayName,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to join room');
    }

    const data = await response.json();
    return data.roomInfo;
  } catch (error) {
    console.error('Error joining room:', error);
    throw error;
  }
};

// Get room information
export const getRoomInfo = async (roomId: string, userId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get room info');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting room info:', error);
    throw error;
  }
};

// Leave a room
export const leaveRoom = async (roomId: string, userId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to leave room');
    }
  } catch (error) {
    console.error('Error leaving room:', error);
    throw error;
  }
};

// Send a message
export const sendMessage = async (roomId: string, userId: string, encryptedMessage: string, iv: string): Promise<Message> => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages/${roomId}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        encryptedMessage,
        iv,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    const data = await response.json();
    return data.message;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Get messages from a room
export const getMessages = async (roomId: string, userId: string, since?: Date): Promise<Message[]> => {
  try {
    let url = `${API_BASE_URL}/messages/${roomId}?userId=${userId}`;
    if (since) {
      url += `&since=${since.toISOString()}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get messages');
    }

    const data = await response.json();
    return data.messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
};

// Generate a unique user ID
const generateUserId = (): string => {
  return 'user-' + Math.random().toString(36).substr(2, 9);
};

// WebSocket connection
let socket: WebSocket | null = null;

interface WebSocketMessage {
  type: string;
  message?: any;
}

interface WebSocketCallbacks {
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export const connectWebSocket = (
  roomId: string,
  userId: string,
  callbacks: WebSocketCallbacks = {}
): WebSocket => {
  const wsUrl = `ws://localhost:3000?roomId=${roomId}&userId=${userId}`;
  
  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log('WebSocket connected');
  };

  socket.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      if (callbacks.onMessage) {
        callbacks.onMessage(message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (callbacks.onError) {
      callbacks.onError(error);
    }
  };

  socket.onclose = () => {
    console.log('WebSocket disconnected');
    if (callbacks.onClose) {
      callbacks.onClose();
    }
  };

  return socket;
};

export const disconnectWebSocket = (): void => {
  if (socket) {
    socket.close();
    socket = null;
  }
};

// Room history is not saved - users start fresh on each session