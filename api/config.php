<?php
/**
 * ShadowLink PHP Backend — Database Configuration
 * Handles MySQL connection and CORS headers 
 */

// CORS Headers — allow cross-origin requests
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== DATABASE CONFIGURATION ====================
// Update these values with your InfinityFree/AeonFree MySQL credentials
$DB_HOST = getenv('DB_HOST') ?: 'localhost';
$DB_NAME = getenv('DB_NAME') ?: 'shadowlink';
$DB_USER = getenv('DB_USER') ?: 'root';
$DB_PASS = getenv('DB_PASS') ?: '';
$DB_PORT = getenv('DB_PORT') ?: '3306';

// Message retention in seconds (1 hour default)
$MESSAGE_RETENTION = getenv('MESSAGE_RETENTION_SECONDS') ?: 3600;

// ==================== DATABASE CONNECTION ====================
try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate a UUID v4
 */
function generateUUID() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Get JSON body from request
 */
function getRequestBody() {
    $body = file_get_contents('php://input');
    return json_decode($body, true) ?: [];
}

/**
 * Send JSON response
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}

/**
 * Clean up expired rooms and messages
 */
function cleanupExpired($pdo) {
    try {
        $pdo->exec("DELETE FROM messages WHERE expires_at <= NOW()");
        $pdo->exec("DELETE FROM users WHERE room_id NOT IN (SELECT id FROM rooms)");
        $pdo->exec("DELETE FROM rooms WHERE expires_at <= NOW()");
    } catch (Exception $e) {
        // Silently fail cleanup
    }
}
