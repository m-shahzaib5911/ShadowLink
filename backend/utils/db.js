const { Pool } = require('pg');
require('dotenv').config();

/**
 * Neon Postgres Database Connection
 * Uses connection pooling via pg.Pool for optimal performance
 */
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Test connection on startup
pool.query('SELECT NOW()')
    .then(() => console.log('  📦 Database: Connected to Neon Postgres'))
    .catch(err => console.error('  ❌ Database connection failed:', err.message));

/**
 * Execute a SQL query
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
        console.log(`[DB] Query: ${text.substring(0, 60)}... | ${duration}ms | ${result.rowCount} rows`);
    }
    return result;
}

/**
 * Initialize the database schema
 */
async function initializeDatabase() {
    try {
        await query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY,
        salt TEXT NOT NULL,
        room_name TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);

        await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT NOT NULL,
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        display_name TEXT,
        public_key TEXT,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (id, room_id)
      )
    `);

        await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY,
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        display_name TEXT,
        encrypted_message TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      )
    `);

        // Create indexes
        await query('CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)');
        await query('CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at)');
        await query('CREATE INDEX IF NOT EXISTS idx_users_room_id ON users(room_id)');
        await query('CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at)');

        console.log('  📋 Database schema initialized');
    } catch (error) {
        console.error('Failed to initialize database schema:', error.message);
        throw error;
    }
}

module.exports = { query, pool, initializeDatabase };
