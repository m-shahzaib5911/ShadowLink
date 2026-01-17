const express = require('express');
const helmet = require('helmet');
const path = require('node:path');
const WebSocket = require('ws');
require('dotenv').config();

// Import custom middleware
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(corsMiddleware);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Store WebSocket connections by room
const roomConnections = new Map(); // roomId -> Set of WebSocket connections

// Function to broadcast messages to room via WebSocket
function broadcastToRoom(roomId, message) {
  const roomClients = roomConnections.get(roomId);
  if (roomClients) {
    roomClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

// Export for use in routes
module.exports.broadcastToRoom = broadcastToRoom;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/relay', require('./routes/relay'));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Catch-all handler: send back index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════╗`);
  console.log(`║   ShadowLink Backend Running       ║`);
  console.log(`╚════════════════════════════════════╝`);
  console.log(``);
  console.log(`  🌐 Server: http://localhost:${PORT}`);
  console.log(`  📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  🔐 Encryption: AES-GCM`);
  console.log(`  🔄 WebSocket: Enabled`);
  console.log(``);
  console.log(`  Ready to secure your communications! 🚀`);
});

// WebSocket server setup
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');

  // Parse room ID from query parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get('roomId');
  const userId = url.searchParams.get('userId');

  if (!roomId || !userId) {
    ws.close(1008, 'Room ID and User ID required');
    return;
  }

  // Add connection to room
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  roomConnections.get(roomId).add(ws);

  console.log(`User ${userId} joined WebSocket room ${roomId}`);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      // Broadcast message to all clients in the same room (except sender)
      const roomClients = roomConnections.get(roomId);
      if (roomClients) {
        roomClients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`User ${userId} left WebSocket room ${roomId}`);

    // Remove connection from room
    const roomClients = roomConnections.get(roomId);
    if (roomClients) {
      roomClients.delete(ws);
      // Clean up empty rooms
      if (roomClients.size === 0) {
        roomConnections.delete(roomId);
      }
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

module.exports = app;