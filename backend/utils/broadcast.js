/**
 * WebSocket broadcast utility
 * Separated to avoid circular dependencies
 */

const roomConnections = new Map(); // roomId -> Set of WebSocket connections

function addRoomConnection(roomId, ws) {
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId).add(ws);
}

function removeRoomConnection(roomId, ws) {
  const clients = roomConnections.get(roomId);
  if (clients) {
    clients.delete(ws);
    if (clients.size === 0) {
      roomConnections.delete(roomId);
    }
  }
}

function broadcastToRoom(roomId, message) {
  const roomClients = roomConnections.get(roomId);
  if (roomClients) {
    roomClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(JSON.stringify(message));
        } catch (error) {
          console.error('Failed to send WebSocket message:', error);
        }
      }
    });
  }
}

module.exports = {
  addRoomConnection,
  removeRoomConnection,
  broadcastToRoom,
  getRoomConnections: () => roomConnections
};
