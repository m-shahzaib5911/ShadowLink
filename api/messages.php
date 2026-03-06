<?php
/**
 * ShadowLink PHP Backend — Messages API
 * 
 * Endpoints:
 *   POST /api/messages.php?action=send     — Send an encrypted message
 *   GET  /api/messages.php?action=fetch    — Fetch messages (for polling)
 *   POST /api/messages.php?action=cleanup  — Clean up expired messages
 */

require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$body = getRequestBody();

switch ($action) {

    // ==================== SEND MESSAGE ====================
    case 'send':
        $roomId = $_GET['roomId'] ?? $body['roomId'] ?? '';
        $userId = $body['userId'] ?? '';
        $encryptedMessage = $body['encryptedMessage'] ?? '';
        $iv = $body['iv'] ?? '';

        if (!$roomId || !$userId || !$encryptedMessage || !$iv) {
            jsonResponse(['success' => false, 'error' => 'Room ID, user ID, encrypted message, and IV required'], 400);
        }

        // Verify room exists
        $stmt = $pdo->prepare('SELECT id FROM rooms WHERE id = ? AND expires_at > NOW()');
        $stmt->execute([$roomId]);
        if (!$stmt->fetch()) {
            jsonResponse(['success' => false, 'error' => 'Room not found'], 404);
        }

        // Verify user is in room
        $stmt = $pdo->prepare('SELECT id, display_name FROM users WHERE id = ? AND room_id = ?');
        $stmt->execute([$userId, $roomId]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['success' => false, 'error' => 'User not in room'], 403);
        }

        $displayName = $user['display_name'];
        $messageId = generateUUID();
        $retention = (int)($GLOBALS['MESSAGE_RETENTION'] ?? 3600);
        $expiresAt = date('Y-m-d H:i:s', time() + $retention);
        $createdAt = date('Y-m-d H:i:s');

        // Insert message
        $stmt = $pdo->prepare('INSERT INTO messages (id, room_id, user_id, display_name, encrypted_message, iv, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$messageId, $roomId, $userId, $displayName, $encryptedMessage, $iv, $createdAt, $expiresAt]);

        jsonResponse([
            'success' => true,
            'message' => [
                'id' => $messageId,
                'timestamp' => $createdAt
            ]
        ], 201);
        break;

    // ==================== FETCH MESSAGES (POLLING) ====================
    case 'fetch':
        $roomId = $_GET['roomId'] ?? '';
        $userId = $_GET['userId'] ?? '';
        $since = $_GET['since'] ?? null;

        if (!$roomId) {
            jsonResponse(['success' => false, 'error' => 'Room ID required'], 400);
        }

        // Verify room exists
        $stmt = $pdo->prepare('SELECT id FROM rooms WHERE id = ? AND expires_at > NOW()');
        $stmt->execute([$roomId]);
        if (!$stmt->fetch()) {
            jsonResponse(['success' => false, 'error' => 'Room not found'], 404);
        }

        // Build query — fetch messages since timestamp (for polling)
        if ($since) {
            $stmt = $pdo->prepare('SELECT * FROM messages WHERE room_id = ? AND expires_at > NOW() AND created_at > ? ORDER BY created_at ASC');
            $stmt->execute([$roomId, $since]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM messages WHERE room_id = ? AND expires_at > NOW() ORDER BY created_at ASC');
            $stmt->execute([$roomId]);
        }

        $messages = $stmt->fetchAll();

        // Get current users in room
        $stmt2 = $pdo->prepare('SELECT id, display_name FROM users WHERE room_id = ? ORDER BY joined_at ASC');
        $stmt2->execute([$roomId]);
        $users = $stmt2->fetchAll();

        jsonResponse([
            'success' => true,
            'messages' => array_map(function($msg) {
                return [
                    'id' => $msg['id'],
                    'roomId' => $msg['room_id'],
                    'userId' => $msg['user_id'],
                    'displayName' => $msg['display_name'],
                    'encryptedMessage' => $msg['encrypted_message'],
                    'iv' => $msg['iv'],
                    'timestamp' => $msg['created_at'],
                    'expiresAt' => $msg['expires_at']
                ];
            }, $messages),
            'users' => array_map(function($u) {
                return ['id' => $u['id'], 'displayName' => $u['display_name']];
            }, $users),
            'serverTime' => date('Y-m-d H:i:s')
        ]);
        break;

    // ==================== CLEANUP ====================
    case 'cleanup':
        cleanupExpired($pdo);
        jsonResponse(['success' => true, 'message' => 'Cleanup complete']);
        break;

    default:
        jsonResponse(['success' => false, 'error' => 'Invalid action. Use: send, fetch, cleanup'], 400);
        break;
}
