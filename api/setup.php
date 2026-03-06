<?php
/**
 * ShadowLink — Database Setup Script
 * Run this once to create the database tables
 * Access via: https://your-domain.com/api/setup.php
 */

require_once __DIR__ . '/config.php';

try {
    // Create rooms table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS rooms (
            id VARCHAR(36) PRIMARY KEY,
            salt TEXT NOT NULL,
            room_name VARCHAR(255) NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            INDEX idx_rooms_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Create users table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) NOT NULL,
            room_id VARCHAR(36) NOT NULL,
            display_name VARCHAR(255),
            public_key TEXT,
            joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, room_id),
            INDEX idx_users_room (room_id),
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    // Create messages table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR(36) PRIMARY KEY,
            room_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(255) NOT NULL,
            display_name VARCHAR(255),
            encrypted_message TEXT NOT NULL,
            iv TEXT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            INDEX idx_messages_room (room_id),
            INDEX idx_messages_expires (expires_at),
            INDEX idx_messages_created (room_id, created_at),
            FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");

    echo json_encode([
        'success' => true,
        'message' => 'Database tables created successfully! You can now use ShadowLink.',
        'tables' => ['rooms', 'users', 'messages']
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => 'Failed to create tables: ' . $e->getMessage()
    ]);
}
