const { Pool } = require('pg');

// Create a connection pool — reused across all requests
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'smart_watchlist',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Keep idle connections alive for up to 30 s
  idleTimeoutMillis: 30000,
  // Fail fast if we can't get a connection within 10 s
  connectionTimeoutMillis: 10000,
});

// Log pool errors so they don't silently crash the process
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Run a parameterised query against the pool.
 * @param {string}  text   - SQL string with $1, $2 … placeholders
 * @param {Array}   [params] - Values for the placeholders
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DB] ${duration}ms | rows: ${result.rowCount} | ${text.slice(0, 80)}`);
    }
    return result;
  } catch (err) {
    console.error('[DB] Query error:', err.message, '\nQuery:', text);
    throw err;
  }
}

/**
 * Borrow a client from the pool for multi-statement transactions.
 * Always release() the client when done.
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
