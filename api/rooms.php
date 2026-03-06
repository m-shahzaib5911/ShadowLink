<?php

/**
 * ShadowLink PHP Backend — Rooms API
 * 
 * Endpoints:
 *   POST /api/rooms.php?action=create  — Create a new room
 *   POST /api/rooms.php?action=join    — Join an existing room
 *   POST /api/rooms.php?action=leave   — Leave a room
 *   GET  /api/rooms.php?action=info&roomId=xxx&userId=yyy  — Get room info
 */

require_once __DIR__ . '/config.php';

// Run cleanup periodically (1 in 20 requests)
if (rand(1, 20) === 1) {
    cleanupExpired($pdo);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$body = getRequestBody();

switch ($action) {

    // ==================== CREATE ROOM ====================
    case 'create':
        $roomName = $body['roomName'] ?? '';
        $password = $body['password'] ?? '';
        $displayName = $body['displayName'] ?? '';
        $userId = $body['userId'] ?? '';
        $salt = $body['salt'] ?? '';

        if (!$roomName || !$password || !$salt) {
            jsonResponse(['success' => false, 'error' => 'Room name, password, and salt required'], 400);
        }

        $roomId = generateUUID();
        $retention = (int)($GLOBALS['MESSAGE_RETENTION'] ?? 3600);
        $expiresAt = date('Y-m-d H:i:s', time() + $retention);
        $createdAt = date('Y-m-d H:i:s');

        // Create room — hash password so plaintext is never stored
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $stmt = $pdo->prepare('INSERT INTO rooms (id, salt, room_name, password, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)');
        $stmt->execute([$roomId, $salt, $roomName, $hashedPassword, $createdAt, $expiresAt]);

        // Add creator as first user
        $stmt = $pdo->prepare('INSERT INTO users (id, room_id, display_name) VALUES (?, ?, ?)');
        $stmt->execute([$userId, $roomId, $displayName]);

        jsonResponse([
            'success' => true,
            'room' => [
                'id' => $roomId,
                'name' => $roomName,
                'salt' => $salt,
                'userCount' => 1,
                'created' => $createdAt,
                'expiresAt' => $expiresAt
            ]
        ], 201);
        break;

    // ==================== JOIN ROOM ====================
    case 'join':
        $roomId = $_GET['roomId'] ?? $body['roomId'] ?? '';
        $userId = $body['userId'] ?? '';
        $password = $body['password'] ?? '';
        $displayName = $body['displayName'] ?? '';

        if (!$roomId || !$userId || !$password || !$displayName) {
            jsonResponse(['success' => false, 'error' => 'Room ID, user ID, password, and display name required'], 400);
        }

        // Find room
        $stmt = $pdo->prepare('SELECT * FROM rooms WHERE id = ? AND expires_at > NOW()');
        $stmt->execute([$roomId]);
        $room = $stmt->fetch();

        if (!$room) {
            jsonResponse(['success' => false, 'error' => 'Room not found'], 404);
        }

        // Verify password against bcrypt hash
        if (!password_verify($password, $room['password'])) {
            jsonResponse(['success' => false, 'error' => 'Incorrect password'], 403);
        }

        // Add user (ON DUPLICATE update display name)
        $stmt = $pdo->prepare('INSERT INTO users (id, room_id, display_name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)');
        $stmt->execute([$userId, $roomId, $displayName]);

        // No system join message stored in DB for privacy
        // Join/leave events detected client-side via user list polling

        // Count users
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM users WHERE room_id = ?');
        $stmt->execute([$roomId]);
        $userCount = (int)$stmt->fetch()['count'];

        jsonResponse([
            'success' => true,
            'message' => 'Joined room successfully',
            'roomInfo' => [
                'id' => $room['id'],
                'name' => $room['room_name'],
                'salt' => $room['salt'],
                'userCount' => $userCount,
                'created' => $room['created_at'],
                'expiresAt' => $room['expires_at']
            ]
        ]);
        break;

    // ==================== LEAVE ROOM ====================
    case 'leave':
        $roomId = $_GET['roomId'] ?? $body['roomId'] ?? '';
        $userId = $body['userId'] ?? '';

        if (!$roomId || !$userId) {
            jsonResponse(['success' => false, 'error' => 'Room ID and User ID required'], 400);
        }

        // Get user display name before removing
        $stmt = $pdo->prepare('SELECT display_name FROM users WHERE id = ? AND room_id = ?');
        $stmt->execute([$userId, $roomId]);
        $user = $stmt->fetch();
        $displayName = $user ? $user['display_name'] : 'Unknown';

        // Remove user
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = ? AND room_id = ?');
        $stmt->execute([$userId, $roomId]);

        // No system leave message stored in DB for privacy
        // Leave events detected client-side via user list polling

        // Delete room if no users remain
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM users WHERE room_id = ?');
        $stmt->execute([$roomId]);
        $count = (int)$stmt->fetch()['count'];

        if ($count === 0) {
            $stmt = $pdo->prepare('DELETE FROM rooms WHERE id = ?');
            $stmt->execute([$roomId]);
        }

        jsonResponse(['success' => true, 'message' => 'Left room successfully']);
        break;

    // ==================== GET ROOM INFO ====================
    case 'info':
        $roomId = $_GET['roomId'] ?? '';
        $userId = $_GET['userId'] ?? '';

        if (!$roomId) {
            jsonResponse(['success' => false, 'error' => 'Room ID required'], 400);
        }

        // Find room
        $stmt = $pdo->prepare('SELECT * FROM rooms WHERE id = ? AND expires_at > NOW()');
        $stmt->execute([$roomId]);
        $room = $stmt->fetch();

        if (!$room) {
            jsonResponse(['success' => false, 'error' => 'Room not found'], 404);
        }

        // Get users
        $stmt = $pdo->prepare('SELECT id, display_name, joined_at FROM users WHERE room_id = ? ORDER BY joined_at ASC');
        $stmt->execute([$roomId]);
        $users = $stmt->fetchAll();

        // Get message count
        $stmt = $pdo->prepare('SELECT COUNT(*) as count FROM messages WHERE room_id = ? AND expires_at > NOW()');
        $stmt->execute([$roomId]);
        $messageCount = (int)$stmt->fetch()['count'];

        jsonResponse([
            'success' => true,
            'room' => [
                'id' => $room['id'],
                'name' => $room['room_name'],
                'salt' => $room['salt'],
                'userCount' => count($users),
                'users' => array_map(function ($u) {
                    return ['displayName' => $u['display_name']];
                }, $users),
                'messageCount' => $messageCount,
                'created' => $room['created_at'],
                'expiresAt' => $room['expires_at']
            ]
        ]);
        break;

    default:
        jsonResponse(['success' => false, 'error' => 'Invalid action. Use: create, join, leave, info'], 400);
        break;
}
