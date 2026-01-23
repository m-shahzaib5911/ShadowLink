# ShadowLink - Quick Start Guide

## Prerequisites
- Node.js (v14 or higher)
- npm
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install

cd ../frontend
# Frontend is static - no npm needed
```

### 2. Start the Backend Server

```bash
cd backend
npm start
```

**Expected Output:**
```
Server running on http://localhost:3000
WebSocket server listening on port 3000
Health check: http://localhost:3000/health
```

### 3. Open Frontend

Option A - Local File:
```bash
# Open in browser
open frontend/index.html
# or navigate to: file:///path/to/ShadowLink/frontend/index.html
```

Option B - With Local Server (recommended):
```bash
cd frontend
python -m http.server 8000
# Navigate to: http://localhost:8000
```

---

## First-Time Test (5 minutes)

### Test 1: Create Your First Room (2 min)

1. **Load the app** - You should see ShadowLink welcome screen
2. **Click "Create Room"** button
3. **Fill in the form:**
   - Room Name: `My Test Room`
   - Your Display Name: `Alice`
   - Password: `test123`
4. **Click "Create Room"**
5. **Verify:**
   - ✓ Notification shows "Room created! Click Share to invite others."
   - ✓ Room appears in sidebar as "My Test Room | 1 user"
   - ✓ Chat header shows "My Test Room" with "1 user"

### Test 2: Share the Room (1 min)

1. **Click "Share" button** in chat header
2. **Share Modal appears showing:**
   - Link: `http://localhost:8000/#room=<some-uuid>`
   - Password: `test123`
   - Instructions to share both
3. **Copy the link** (click "Copy Link" button)
4. **Write down the password** (or copy from modal)

### Test 3: Join from Same Browser (2 min)

1. **Open new browser tab**
2. **Paste the link** in address bar
3. **Press Enter**
4. **Join Modal appears with:**
   - Shareable Link pre-filled: `<the room id>`
   - Your Display Name: (empty)
   - Password: (empty)
5. **Fill in:**
   - Your Display Name: `Bob`
   - Password: `test123`
6. **Click "Join Room"**
7. **Verify:**
   - ✓ You can now see the room
   - ✓ **BOTH TABS** show "My Test Room | 2 users"
   - ✓ User count updated in real-time

---

## Advanced Test (10 minutes)

### Test 4: Multiple Users Joining

1. **In first tab (Alice):** Create room "Discussion"
2. **In second tab (Bob):** Join from link, enter name "Bob"
3. **In third tab (Carol):** 
   - Open new tab
   - Paste same link
   - Join with name "Carol"
4. **Verify in ALL tabs:**
   - ✓ Header shows "Discussion | 3 users"
   - ✓ Sidebar shows "3 users"
   - ✓ All tabs sync in real-time

### Test 5: Wrong Password

1. **In new tab:** Go to the room link
2. **Try to join with:**
   - Display Name: `Hacker`
   - Password: `wrong123`
3. **Click "Join Room"**
4. **Verify:**
   - ✗ Error notification: "Incorrect password"
   - ✗ Join fails
   - ✓ Try again with correct password works

### Test 6: Send Messages

1. **In any tab** with joined room
2. **Type in message input:** "Hello, everyone!"
3. **Press Send** or click button
4. **Verify in ALL tabs:**
   - ✓ Message appears immediately
   - ✓ Message is shown with timestamp
   - ✓ Your message appears on right (own)
   - ✓ Others' messages appear on left

### Test 7: Leave Room

1. **Click "Leave" button** in chat header
2. **Verify:**
   - ✓ Room disappears from sidebar
   - ✓ Welcome screen shows
   - ✓ Other users see user count decrease

---

## Troubleshooting Quick Fixes

### Issue: "Cannot connect to server"
```bash
# Check backend is running
# Terminal should show: "Server running on http://localhost:3000"

# If not:
cd backend
npm start

# Or check if port 3000 is in use:
# Windows: netstat -ano | findstr :3000
# Mac/Linux: lsof -i :3000
```

### Issue: "Network error" on creating room
```bash
# Verify backend URL matches frontend location
# If backend on different port, update in frontend/js/api.js:
# baseURL: 'http://localhost:3000'
```

### Issue: User count shows wrong number
```bash
# Refresh the page
# WebSocket might need to reconnect
# Page refresh reloads from server
```

### Issue: Share link doesn't work
```bash
# Verify the link format: http://localhost:PORT/#room=UUID
# If just shows UUID, open: http://localhost:PORT/#room=UUID
# If nothing after #, check browser console for errors
```

### Issue: Can't send messages
```bash
# Check browser console (F12) for errors
# Verify room encryption key is set
# Try leaving and re-joining room
```

---

## Development Tips

### View Console Logs
1. **Press F12** to open Developer Tools
2. **Click "Console" tab**
3. **You'll see:**
   - App initialization logs
   - WebSocket connection status
   - API request/response logs
   - Any errors

### Common Console Messages (Normal)
```javascript
// Normal operation
"Initializing ShadowLink..."
"WebSocket connected"
"Room created successfully"
"User joined room"
"Message sent"

// These are OK
"WebSocket disconnected" - Falls back to polling
"API request timeout" - Retries
```

### Check Network Tab
1. **Press F12**
2. **Click "Network" tab**
3. **Perform action (create room, join, etc.)**
4. **See HTTP requests:**
   - POST /api/rooms/create
   - POST /api/rooms/{id}/join
   - GET /api/rooms/{id}
   - POST /api/messages/{id}/send

### Check WebSocket
1. **Click "Network" tab**
2. **Filter by "WS"**
3. **You should see WebSocket connection**
4. **Click on it to see messages**

---

## File Structure Quick Reference

```
ShadowLink/
├── backend/                    # Server code
│   ├── server.js              # Express + WebSocket server
│   ├── routes/
│   │   └── rooms.js           # Room endpoints
│   ├── models/
│   │   ├── Room.js            # ← MODIFIED: password, roomName
│   │   └── User.js            # ← MODIFIED: displayName
│   └── middleware/
│       └── auth.js            # Room access validation
│
├── frontend/                   # Client code
│   ├── index.html             # ← MODIFIED: updated modals
│   └── js/
│       ├── app.js             # ← MODIFIED: room logic
│       ├── api.js             # ← MODIFIED: API methods
│       └── ui.js              # ← MODIFIED: display methods
│
├── README.md
├── CHANGES_SUMMARY.md         # ← NEW: full change list
├── TESTING_GUIDE.md           # ← NEW: how to test
├── VISUAL_GUIDE.md            # ← NEW: visual explanations
├── IMPLEMENTATION_DETAILS.md  # ← NEW: technical details
└── VERIFICATION_CHECKLIST.md  # ← NEW: verification
```

---

## Key Endpoints (for manual testing with curl)

### Create Room
```bash
curl -X POST http://localhost:3000/api/rooms/create \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "Test Room",
    "password": "secret123",
    "displayName": "Alice"
  }'
```

### Join Room
```bash
curl -X POST http://localhost:3000/api/rooms/ROOM_ID/join \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "displayName": "Bob",
    "password": "secret123"
  }'
```

### Get Room Info
```bash
curl http://localhost:3000/api/rooms/ROOM_ID
```

---

## Performance Tips

### For Smooth Testing
- Use localhost (avoid network delays)
- Keep browser developer tools closed (saves memory)
- Close other tabs if system is slow
- Use Chrome for best WebSocket support

### If Laggy
1. Restart browser
2. Restart backend server
3. Clear browser cache: Ctrl+Shift+Delete
4. Check system resources (Task Manager/Activity Monitor)

---

## Next Steps After Testing

1. **Verify all features work** - Use checklist in TESTING_GUIDE.md
2. **Review changes** - See CHANGES_SUMMARY.md for full list
3. **Understand implementation** - Read IMPLEMENTATION_DETAILS.md
4. **Plan enhancements** - See feature ideas in docs
5. **Deploy** - Move to production server

---

## Support Resources

### Documentation Files
- 📄 [CHANGES_SUMMARY.md](CHANGES_SUMMARY.md) - What changed
- 📄 [TESTING_GUIDE.md](TESTING_GUIDE.md) - How to test
- 📄 [VISUAL_GUIDE.md](VISUAL_GUIDE.md) - Visual explanations
- 📄 [IMPLEMENTATION_DETAILS.md](IMPLEMENTATION_DETAILS.md) - Technical deep dive
- 📄 [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) - Verification steps

### Browser Tools
- Press F12 - Developer console
- Network tab - See all API requests
- Console tab - View logs and errors

### Terminal Commands
```bash
# Check if backend is running
curl http://localhost:3000/health

# View backend logs (if running in terminal)
# Look for: "User joined room", "Room created", etc.

# Kill a process on port 3000
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>
```

---

## Estimated Time to Full Understanding

- **Quick Test:** 5 minutes
- **Advanced Tests:** 10 minutes
- **Read all docs:** 20 minutes
- **Full review:** 30 minutes
- **Ready to modify:** 1 hour

---

## Quick Reference Card

```
CREATE ROOM
┌─ Click "Create Room"
├─ Enter: Room Name, Display Name, Password
├─ Click "Create Room"
└─ Result: Room with 1 user

SHARE ROOM
┌─ Click "Share"
├─ View: Link & Password
├─ Share: Send both to others
└─ Result: Others can join

JOIN ROOM
┌─ Click/Paste shared link
├─ Enter: Display Name, Password
├─ Click "Join Room"
└─ Result: Joined, see room with updated user count

SEND MESSAGE
┌─ Type message
├─ Press Enter or click Send
└─ Result: Message appears for all users in real-time

LEAVE ROOM
┌─ Click "Leave"
└─ Result: Room removed from sidebar, user count decreases
```

---

## Success Criteria

Your setup is successful when:
- ✅ Backend starts without errors
- ✅ Frontend loads with welcome screen
- ✅ Can create a room with 1 user
- ✅ Can share room and see link
- ✅ Can join from link with password
- ✅ User count shows 2 in both tabs
- ✅ Can send/receive messages
- ✅ Can leave room
- ✅ No errors in browser console

**You're all set! 🎉**

