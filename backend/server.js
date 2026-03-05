const express = require('express');
const helmet = require('helmet');
const path = require('node:path');
const fs = require('fs');
const WebSocket = require('ws');
require('dotenv').config();

// Import database
const { initializeDatabase } = require('./utils/db');
const store = require('./utils/store');

// Import custom middleware
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { addRoomConnection, removeRoomConnection, getRoomConnections, broadcastToRoom } = require('./utils/broadcast');

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

// Serve static frontend files (check Docker path first, then local dev path)
const dockerBuildPath = path.join(__dirname, 'frontend-build');
const localBuildPath = path.join(__dirname, '../frontend/build');
const frontendPath = fs.existsSync(dockerBuildPath) ? dockerBuildPath : localBuildPath;

app.use(express.static(frontendPath));

// Catch-all handler: send back index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database schema
    await initializeDatabase();

    // Start HTTP server
    const server = app.listen(PORT, '0.0.0.0', () => {
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
      // Parse room ID from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const roomId = url.searchParams.get('roomId');
      const userId = url.searchParams.get('userId');

      if (!roomId || !userId) {
        ws.close(1008, 'Room ID and User ID required');
        return;
      }

      // Add connection to room
      addRoomConnection(roomId, ws);

      // Get user display name and broadcast join
      (async () => {
        try {
          const user = await store.getUser(userId, roomId);
          const displayName = user?.displayName || userId.substring(0, 8);

          broadcastToRoom(roomId, {
            type: 'user_joined',
            userId: userId,
            displayName: displayName,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('WebSocket join error:', error);
        }
      })();

      // Handle incoming messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          // Broadcast message to all clients in the same room (except sender)
          const roomConnections = getRoomConnections();
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
        (async () => {
          try {
            const user = await store.getUser(userId, roomId);
            const displayName = user?.displayName || userId.substring(0, 8);

            // Broadcast user left event
            broadcastToRoom(roomId, {
              type: 'user_left',
              userId: userId,
              displayName: displayName,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('WebSocket leave error:', error);
          }
        })();

        // Remove connection from room
        removeRoomConnection(roomId, ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Periodic cleanup of expired rooms and messages
    setInterval(async () => {
      try {
        await store.cleanupExpiredMessages();
        await store.cleanupExpiredRooms();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }, 60000);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;