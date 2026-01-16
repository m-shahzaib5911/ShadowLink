const express = require('express');
const helmet = require('helmet');
const path = require('path');
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
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
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

// Start server
app.listen(PORT, () => {
  console.log(`╔════════════════════════════════════╗`);
  console.log(`║   ShadowLink Backend Running       ║`);
  console.log(`╚════════════════════════════════════╝`);
  console.log(``);
  console.log(`  🌐 Server: http://localhost:${PORT}`);
  console.log(`  📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  🔐 Encryption: XChaCha20-Poly1305`);
  console.log(``);
  console.log(`  Ready to secure your communications! 🚀`);
});

module.exports = app;