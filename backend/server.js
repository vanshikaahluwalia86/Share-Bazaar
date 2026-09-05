require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'smart-market-watchlist-backend',
  });
});

// ── Middleware: Auth extraction ─────────────────────────────────────────────
const { optionalAuth } = require('./middleware/auth');

// ── Routes ───────────────────────────────────────────────────────────────────
// Authentication (Register, OTP verify, Login, Logout, Me)
app.use('/api/auth', require('./routes/auth'));

// Phase 3: Watchlist CRUD (User-scoped via token or demo fallback)
app.use('/api/watchlist', optionalAuth, require('./routes/watchlist'));

// Phase 4: Market data (User-scoped snapshots & attention calculation)
app.use('/api/market', optionalAuth, require('./routes/market'));

// Phase 9: AI explanation
app.use('/api/ai', optionalAuth, require('./routes/ai'));

// ── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

// ── Start ────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runAutoMigrations() {
  try {
    const sqlPath = path.join(__dirname, 'db', 'auth_migration.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await db.query(sql);
      console.log('[DB] Auth migrations verified.');
    }
  } catch (err) {
    console.warn('[DB] Auto-migration warning:', err.message);
  }
}

app.listen(PORT, () => {
  console.log(`✅  Backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  runAutoMigrations();
});
