# ShadowLink - Testing Guide

## Quick Test Checklist

### Test 1: Create a Room
1. Open the application
2. Click "Create Room" or "Welcome - Create Room"
3. **Expected Modal:** Form with 3 fields (Room Name, Display Name, Password)
4. Fill in:
   - Room Name: "Test Room"
   - Display Name: "Alice"
   - Password: "test123"
5. Click "Create Room"
6. **Expected Result:**
   - Modal closes
   - Success notification appears
   - Room appears in sidebar as "Test Room" with "1 user"
   - Chat area shows "Test Room" in header with "1 user"

### Test 2: Share Room
1. After creating a room, click "Share" button in chat header
2. **Expected Modal:**
   - Shows a shareable link (e.g., `http://localhost:3000/#room=abc-123-def...`)
   - Shows the room password below
   - Has a "Copy Link" button
   - Has instructions about sharing link and password
3. Copy the link
4. **Expected Behavior:** Link copies to clipboard

### Test 3: Join Room (Same Browser)
1. Open a new tab
2. Paste the shared link in address bar
3. Navigate to it
4. **Expected Behavior:**
   - Join modal appears automatically
   - Room ID pre-filled in "Shareable Link" field
5. Fill in:
   - Display Name: "Bob"
   - Password: "test123"
6. Click "Join Room"
7. **Expected Result:**
   - Join room succeeds
   - Room appears in sidebar
   - Chat area shows "Test Room" with "2 users"
   - Both tabs/windows show updated user count

### Test 4: Join Room (Different User/Device)
1. Share link + password with another user
2. They navigate to the link
3. Join modal appears with room ID pre-filled
4. They enter their display name and password
5. They join successfully
6. All clients see updated user count

### Test 5: Wrong Password
1. Attempt to join with wrong password
2. **Expected Result:**
   - Error notification: "Incorrect password"
   - Join fails

### Test 6: Display Names in Sidebar
1. Create/join multiple rooms
2. Each room should show the name you gave it, not a truncated ID
3. User count should show proper singular/plural form

### Test 7: User Count Accuracy
1. Create room alone: "1 user"
2. Add second user: "2 users"
3. Add third user: "3 users"
4. Verify count is consistent across all clients

---

## Known Behaviors

### Expected:
- Room names are displayed instead of IDs ✓
- Only one link to share (no key in URL) ✓
- Password must be entered when joining ✓
- User count starts at 1 for creator ✓
- User count increments as users join ✓

### Backend Validation:
- Password must match to join
- Display name is required
- User ID is required (auto-generated)
- Room must exist

### Frontend Validation:
- Room name required for creation
- Display name required for creation and joining
- Password required for both
- Link must be valid or empty for join

---

## Troubleshooting

### Issue: "Room not found"
- **Cause:** Room ID in link doesn't exist
- **Solution:** Create new room and share new link

### Issue: "Incorrect password"
- **Cause:** Wrong password entered
- **Solution:** Verify password with room creator

### Issue: User count wrong
- **Cause:** Page not refreshed or stale data
- **Solution:** Reload page or wait for WebSocket update

### Issue: Room name showing as UUID
- **Cause:** Backend didn't save room name properly
- **Solution:** Check backend logs, restart server

### Issue: Cannot copy link
- **Cause:** Browser clipboard permission denied
- **Solution:** Grant clipboard permission in browser settings

---

## File Locations

**Modified Files:**
- Backend:
  - `backend/models/Room.js` - Added password and roomName
  - `backend/models/User.js` - Added displayName
  - `backend/routes/rooms.js` - Updated endpoints
  
- Frontend:
  - `frontend/js/api.js` - Updated API methods
  - `frontend/js/app.js` - Updated room logic
  - `frontend/js/ui.js` - Updated display methods
  - `frontend/index.html` - Cleaned up modals

---

## API Endpoints Tested

### POST /api/rooms/create
```json
Request: {
  "roomName": "Test Room",
  "password": "test123",
  "displayName": "Alice"
}

Response: {
  "success": true,
  "room": {
    "id": "uuid-123",
    "name": "Test Room",
    "key": "encryption-key",
    "userCount": 1,
    ...
  }
}
```

### POST /api/rooms/:roomId/join
```json
Request: {
  "userId": "user-id",
  "displayName": "Bob",
  "password": "test123"
}

Response: {
  "success": true,
  "roomInfo": {
    "id": "uuid-123",
    "name": "Test Room",
    "key": "encryption-key",
    "userCount": 2,
    ...
  }
}
```

### GET /api/rooms/:roomId
```json
Response: {
  "success": true,
  "room": {
    "id": "uuid-123",
    "name": "Test Room",
    "userCount": 2,
    ...
  }
}
```

