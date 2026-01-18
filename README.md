# 🔒 ShadowLink

**End-to-End Encrypted, Ephemeral Messaging Platform**

ShadowLink is a secure messaging application that prioritizes user privacy through end-to-end encryption, anonymous communication, and automatic message deletion.

## ✨ Features

- 🔐 **End-to-End Encryption** - Messages encrypted with AES-GCM
- 👤 **Anonymous** - No user accounts or personal data collection
- ⏰ **Ephemeral** - Messages auto-delete after 1 hour
- 🌐 **Decentralized** - Can operate on multiple relay nodes
- 📱 **Responsive** - Works on desktop and mobile
- 🚀 **Fast** - Minimal JavaScript, no frameworks
- ⚡ **Real-time** - WebSocket-powered instant messaging
- 🛠️ **Reliable Messaging** - Fixed message sending issues for better reliability
- 🎨 **Enhanced UI** - Improved join room interface and user experience

## 📊 **Project Status**

✅ **Fully Implemented & Deployed**
- **Repository:** https://github.com/m-shahzaib5911/ShadowLink
- **Backend:** Running on Node.js/Express
- **Frontend:** Vanilla JS with E2EE encryption
- **Security:** AES-GCM implementation
- **Deployment:** Docker ready, production configured

##  Quick Start

### Prerequisites

- Node.js 18+
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/m-shahzaib5911/ShadowLink.git
   cd ShadowLink
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm start
   ```

3. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🐳 Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build manually
cd backend
docker build -t shadowlink .
docker run -p 3000:3000 shadowlink
```

## 📖 Usage

1. **Create a Room** - Click "Create New Room" to generate a secure chat room
2. **Share the Link** - Copy the room URL and share it with others
3. **Start Chatting** - Messages are encrypted before leaving your device
4. **Auto-Delete** - Messages disappear after 1 hour for privacy

## 🏗️ Architecture

### Backend (Node.js + Express)
- RESTful API with JSON responses
- In-memory storage (ephemeral)
- libsodium-wrappers for crypto operations
- Helmet for security headers
- CORS enabled for browser requests

### Frontend (Vanilla JavaScript)
- No frameworks, minimal bundle size (~20KB)
- Web Crypto API for AES-GCM encryption
- Local/session storage for user data and keys
- Responsive green/black theme design
- Real-time WebSocket messaging
- Progressive Web App ready

### Security Layers
1. **Client Encryption** - XChaCha20-Poly1305 E2EE
2. **Transport Security** - HTTPS/TLS encryption
3. **Storage Security** - RAM-only, auto-expiring
4. **Access Control** - Room-based authorization
5. **Input Validation** - Comprehensive sanitization

## 🔧 API Documentation

### Rooms
- `POST /api/rooms/create` - Create new room
- `POST /api/rooms/:id/join` - Join existing room
- `GET /api/rooms/:id` - Get room info
- `POST /api/rooms/:id/leave` - Leave room

### Messages
- `POST /api/messages/:roomId/send` - Send encrypted message
- `GET /api/messages/:roomId` - Get messages
- `POST /api/messages/cleanup` - Clean expired messages

### Relay
- `POST /api/relay/register` - Register relay node
- `GET /api/relay/list` - List relays
- `GET /api/relay/status/:id` - Get relay status

## 🔒 Security

ShadowLink implements multiple security layers:

- **Cryptography**: AES-GCM AEAD encryption
- **Key Management**: Client-side key generation and storage
- **Transport**: HTTPS with TLS 1.3
- **Storage**: Ephemeral in-memory storage
- **Anonymity**: No user tracking or accounts
- **Validation**: Input sanitization and validation

### Threat Model

✅ **Protected Against:**
- ISP surveillance
- Man-in-the-middle attacks
- Server compromise
- Message tampering
- Brute force attacks

⚠️ **Not Protected Against:**
- Keylogger malware on user devices
- Physical access to user devices
- Social engineering attacks

## 🛠️ Development

### Project Structure
```
ShadowLink/
├── backend/                # Node.js API server
│   ├── server.js          # Main Express application
│   ├── routes/            # API endpoints (rooms, messages, relay)
│   ├── models/            # Data structures (Room, Message, User)
│   ├── middleware/        # Express middleware (auth, encryption, cors)
│   ├── utils/             # Utilities (crypto, logger, validation)
│   └── package.json       # Dependencies and scripts
├── frontend/               # Static web frontend
│   ├── index.html         # Main HTML interface
│   ├── css/               # Stylesheets (green/black theme)
│   ├── js/                # Client-side JavaScript modules
│   └── assets/            # Static assets (future use)
├── docker-compose.yml     # Docker container orchestration
├── .gitignore            # Git exclusions
└── README.md             # This documentation
```

### Scripts

```bash
# Development
npm run dev          # Start with auto-reload
npm start           # Production start
npm test            # Run tests (future)

# Docker
docker-compose up   # Start services
docker-compose down # Stop services
```

## 🚀 Production Deployment

1. **Set environment variables**
   ```bash
   NODE_ENV=production
   PORT=3000
   CORS_ORIGIN=https://yourdomain.com
   ```

2. **SSL Certificate** (Let's Encrypt)
   ```bash
   certbot certonly --standalone -d yourdomain.com
   ```

3. **Process Manager**
   ```bash
   npm install -g pm2
   pm2 start server.js --name shadowlink
   ```

4. **Reverse Proxy** (Nginx)
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;

       ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (future)
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Disclaimer

This is a proof-of-concept implementation. For production use:
- Add comprehensive testing
- Implement rate limiting
- Add monitoring and alerting
- Use a proper database for persistence
- Add user authentication if needed

## 🔗 Links

- [AES-GCM Specification](https://tools.ietf.org/html/rfc5288)
- [Web Cryptography API](https://www.w3.org/TR/WebCryptoAPI/)
- [Express.js](https://expressjs.com/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

---

**Built with privacy and security in mind** 🔒✨