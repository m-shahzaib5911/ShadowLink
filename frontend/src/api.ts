// ShadowLink Frontend API Layer — PHP Backend with Polling
// All API calls go to /api/*.php endpoints

// Detect API base URL dynamically
const getApiBaseUrl = (): string => {
  return `${window.location.origin}/api`;
};

const API_BASE_URL = getApiBaseUrl();

// ==================== TYPES ====================

interface Room {
  id: string;
  name: string;
  salt: string;
  userCount: number;
  created: string;
  expiresAt: string;
}

interface Message {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  encryptedMessage: string;
  iv: string;
  timestamp: string;
  expiresAt: string;
  decryptedMessage?: string;
  isJoinNotification?: boolean;
  isLeaveNotification?: boolean;
}

interface UserRoom {
  roomId: string;
  roomName: string;
  userId: string;
  password: string;
  salt: string;
}

interface User {
  id: string;
  displayName: string;
}

// ==================== SALT GENERATION ====================

export const generateSalt = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const generateUserId = (): string => {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return 'user-' + Array.from(array, byte => byte.toString(36)).join('').substring(0, 10);
};

// ==================== ROOM API ====================

export const createRoom = async (roomName: string, password: string, displayName: string, userId?: string): Promise<Room> => {
  try {
    const salt = generateSalt();
    const response = await fetch(`${API_BASE_URL}/rooms.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomName,
        password,
        displayName,
        userId: userId || generateUserId(),
        salt
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to create room');
    return data.room;
  } catch (error) {
    console.error('Create room error:', error);
    throw error;
  }
};

export const joinRoom = async (roomId: string, password: string, displayName: string, userId?: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms.php?action=join&roomId=${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        userId: userId || generateUserId(),
        password,
        displayName
      })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to join room');
    return data;
  } catch (error) {
    console.error('Join room error:', error);
    throw error;
  }
};

export const leaveRoom = async (roomId: string, userId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms.php?action=leave&roomId=${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to leave room');
    return data;
  } catch (error) {
    console.error('Leave room error:', error);
    throw error;
  }
};

export const getRoomInfo = async (roomId: string, userId: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/rooms.php?action=info&roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to get room info');
    return data;
  } catch (error) {
    console.error('Get room info error:', error);
    throw error;
  }
};

// ==================== MESSAGES API ====================

export const sendMessage = async (roomId: string, userId: string, encryptedMessage: string, iv: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/messages.php?action=send&roomId=${encodeURIComponent(roomId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, userId, encryptedMessage, iv })
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to send message');
    return data;
  } catch (error) {
    console.error('Send message error:', error);
    throw error;
  }
};

export const getMessages = async (roomId: string, userId: string, since?: string): Promise<any> => {
  try {
    let url = `${API_BASE_URL}/messages.php?action=fetch&roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`;
    if (since) url += `&since=${encodeURIComponent(since)}`;

    const response = await fetch(url);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch messages');
    return data;
  } catch (error) {
    console.error('Get messages error:', error);
    throw error;
  }
};

// ==================== POLLING (replaces WebSocket) ====================

let pollingInterval: NodeJS.Timeout | null = null;
let lastMessageTimestamp: string | null = null;

export interface PollingCallbacks {
  onNewMessages?: (messages: Message[]) => void;
  onUsersUpdate?: (users: User[]) => void;
  onError?: (error: Error) => void;
}

export const startPolling = (roomId: string, userId: string, callbacks: PollingCallbacks = {}) => {
  stopPolling(); // Clear any existing polling
  lastMessageTimestamp = null;

  const poll = async () => {
    try {
      const data = await getMessages(roomId, userId, lastMessageTimestamp || undefined);

      if (data.messages && data.messages.length > 0) {
        // Update the timestamp to only get new messages next time
        const lastMsg = data.messages[data.messages.length - 1];
        lastMessageTimestamp = lastMsg.timestamp;

        if (callbacks.onNewMessages) {
          callbacks.onNewMessages(data.messages);
        }
      }

      if (data.users && callbacks.onUsersUpdate) {
        callbacks.onUsersUpdate(data.users);
      }
    } catch (error) {
      if (callbacks.onError) {
        callbacks.onError(error as Error);
      }
    }
  };

  // Initial fetch (all messages)
  poll();

  // Poll every 2 seconds
  pollingInterval = setInterval(poll, 2000);
};

export const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  lastMessageTimestamp = null;
};