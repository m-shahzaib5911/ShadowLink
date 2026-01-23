# ShadowLink - Implementation Details

## Architecture Overview

### Room Lifecycle

```
1. CREATE ROOM
   ├── User provides: roomName, displayName, password
   ├── Backend creates Room with UUID
   ├── Creator automatically added as first user (userCount = 1)
   ├── Room stored in memory (rooms Map)
   └── Response includes: roomId, encryptionKey, roomName, userCount

2. SHARE ROOM
   ├── Link format: http://example.com/#room={roomId}
   ├── Password shared separately (verbally or secure channel)
   └── Link only contains room ID, not encryption key

3. JOIN ROOM
   ├── User clicks shared link
   ├── Join modal pre-fills with roomId
   ├── User provides: displayName, password
   ├── Backend validates: room exists, password matches
   ├── User added to room (userCount increments)
   └── User receives: encryptionKey, updated userCount

4. ACTIVE ROOM
   ├── Messages encrypted with room key
   ├── User count visible to all members
   ├── WebSocket for real-time updates
   └── Messages auto-expire after retention period

5. LEAVE ROOM
   ├── User removed from room
   ├── userCount decrements
   ├── All members notified of count change
   └── User data removed from memory
```

---

## Data Structures

### Room Class
```javascript
{
  id: String (UUID),                    // Unique identifier
  key: String,                          // Encryption key (shared with users after auth)
  roomName: String,                     // Display name set by creator
  password: String,                     // Required to join (plain text, can be hashed later)
  created: Date,                        // Creation timestamp
  users: Map<userId, User>,             // Active users
  messages: Array<Message>,             // Message history
  expiresAt: Date,                      // Auto-delete timestamp
}
```

### User Class
```javascript
{
  id: String (UUID),                    // Unique identifier
  roomId: String,                       // Room they belong to
  publicKey: String,                    // For future group encryption
  displayName: String,                  // Name shown to other users
  joinedAt: Date,                       // When they joined
}
```

---

## Database vs In-Memory Storage

### Current Implementation
- **In-Memory:** Uses Map for rooms and users
- **Pro:** Fast, simple, perfect for demo
- **Con:** Data lost on restart

### For Production
Consider adding persistent storage:
- MongoDB for room metadata
- Redis for active user sessions
- PostgreSQL for message history

**Migration Path:**
1. Add database models alongside Room/User classes
2. Update routes to use DB queries
3. Add message persistence
4. Add room expiration cleanup task

---

## Security Considerations

### Current Level
- **Passwords:** Plain text in memory (not hashed)
- **Encryption Keys:** Shared only after authentication
- **HTTPS:** Recommended for production
- **WebSocket:** Should use WSS (secure WebSocket)

### Improvements for Production
1. Hash room passwords with bcrypt
2. Add rate limiting on join attempts
3. Implement token-based authentication
4. Add audit logging for access
5. Use environment variables for secrets
6. Enable CORS properly
7. Add request validation middleware
8. Implement refresh tokens for sessions

---

## API Flow Diagrams

### Create Room Flow
```
Client                          Backend
  |                               |
  |--- POST /api/rooms/create --->|
  |   {roomName, password,         |
  |    displayName}                |
  |                          Generate UUID
  |                          Create Room object
  |                          Create User for creator
  |                          Add to rooms Map
  |<--- 201 JSON response ---------|
  |   {room info with userCount=1}|
  |                               |
  Display room in sidebar
```

### Join Room Flow
```
Client                          Backend
  |                               |
  |--- POST /api/rooms/roomId --->|
  |   /join {userId,               |
  |    password,                   |
  |    displayName}                |
  |                          Verify room exists
  |                          Verify password
  |                          Create User object
  |                          Add to room.users
  |<--- 200 JSON response ---------|
  |   {roomInfo with updated      |
  |    userCount,                 |
  |    encryptionKey}             |
  |                               |
  Subscribe to WebSocket
  Add room to sidebar
```

### Message Handling
```
Client A                        Backend                       Client B
   |                              |                              |
   |--- POST /api/messages ------>|                              |
   |   {encrypted message}        |                              |
   |                         Store message
   |                         Broadcast via WS
   |                         Reply 200 OK
   |<--- 200 OK ---------|        |                              |
   |                     |   WS broadcast: new_message
   |                     |                                ------->|
   |                     |                         Receive & decrypt
   |                     |                         Display in chat
```

---

## Future Enhancement Ideas

### Feature Additions
- [ ] Custom room colors/themes
- [ ] Room description/topic
- [ ] User list with online status
- [ ] Typing indicators
- [ ] Message reactions/emoji
- [ ] File sharing
- [ ] Voice/video calling
- [ ] Screen sharing
- [ ] Search message history

### Performance Improvements
- [ ] Message pagination/infinite scroll
- [ ] Room list pagination
- [ ] Caching layer (Redis)
- [ ] Message indexing (Elasticsearch)
- [ ] Database query optimization

### Admin Features
- [ ] Room settings modification
- [ ] User moderation
- [ ] Message moderation
- [ ] Analytics/statistics
- [ ] Audit logs
- [ ] Rate limiting

### User Experience
- [ ] Dark mode
- [ ] Mobile app
- [ ] Desktop notifications
- [ ] Favorites/starred rooms
- [ ] Search functionality
- [ ] User preferences
- [ ] Auto-save drafts

---

## Testing Strategy

### Unit Tests Needed
- Room creation validation
- Password verification
- User addition/removal
- Message encryption/decryption
- User count accuracy

### Integration Tests Needed
- Full create-join-message flow
- Multiple concurrent users
- User leaving room
- Room expiration
- WebSocket connection handling

### Load Tests Needed
- 100+ concurrent users
- 1000+ messages in room
- Multiple simultaneous room operations

### Security Tests Needed
- SQL injection prevention
- XSS prevention
- CSRF protection
- Rate limiting verification
- Permission validation

---

## Monitoring & Logging

### Key Metrics to Track
- Active rooms count
- Active users count
- Messages per second
- Average room lifetime
- Average user session duration
- Error rates
- API response times
- WebSocket connection success rate

### Log Levels
```javascript
// Current logger usage (see backend/utils/logger.js)
logger.info('Room created', { roomId });
logger.warn('Expired room accessed', { roomId });
logger.error('Database connection failed', { error: e.message });
logger.debug('Message encrypted', { roomId, messageId });
```

### Recommended Monitoring Stack
- Application: New Relic, DataDog
- Logging: ELK Stack, Splunk
- Performance: Grafana + Prometheus
- Error Tracking: Sentry

---

## Code Patterns Used

### Async/Await Pattern
```javascript
async joinRoom(roomId, displayName, password) {
  try {
    const response = await api.joinRoom(roomId, displayName, password);
    // Handle success
  } catch (error) {
    // Handle error
  }
}
```

### Map-Based Storage
```javascript
const rooms = new Map();
rooms.set(roomId, room);
room = rooms.get(roomId);
rooms.delete(roomId);
```

### Event-Driven Architecture
```javascript
// Room events dispatched via WebSocket
{ type: 'new_message', message: {...} }
{ type: 'user_joined', user: {...} }
{ type: 'user_left', userId: '...' }
```

### Module Pattern (ES6)
```javascript
// Each file is a module
export default class/object/function
import module from './path.js'
```

---

## Deployment Checklist

### Before Production
- [ ] Switch to HTTPS/WSS
- [ ] Hash passwords with bcrypt
- [ ] Add database persistence
- [ ] Implement rate limiting
- [ ] Enable CORS properly
- [ ] Add environment variable config
- [ ] Set up monitoring/logging
- [ ] Add health checks
- [ ] Load test the system
- [ ] Security audit
- [ ] Performance optimization
- [ ] Documentation complete
- [ ] Error handling comprehensive
- [ ] Input validation everywhere

### Docker Setup
```dockerfile
# See Dockerfile in backend/
# - Node environment
# - npm install
# - Health check
# - Port 3000 exposed
```

---

## Troubleshooting Guide for Developers

### Common Issues & Solutions

**Issue:** User count not updating for other clients
- **Cause:** WebSocket not broadcasting user updates
- **Fix:** Add userCount update to WebSocket message handler
- **Location:** `backend/server.js` WebSocket handler

**Issue:** Room password not persisting across requests
- **Cause:** Room being recreated or Map being cleared
- **Fix:** Verify room exists in Map when accessed
- **Location:** `backend/middleware/auth.js` verifyRoomAccess

**Issue:** Display names showing as undefined
- **Cause:** displayName not passed to User constructor
- **Fix:** Ensure displayName passed in join/create routes
- **Location:** `backend/routes/rooms.js`

**Issue:** ShareableLink copy not working
- **Cause:** Browser clipboard API not available
- **Fix:** Check for HTTPS requirement for clipboard API
- **Location:** `frontend/js/ui.js` copyToClipboard method

**Issue:** Messages not decrypting
- **Cause:** Wrong encryption key or corrupted data
- **Fix:** Verify encryption key matches room key
- **Location:** `frontend/js/app.js` handleWebSocketMessage

