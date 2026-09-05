-- ============================================================
-- Smart Market Watchlist — PostgreSQL Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ───────────────────────────────────────────────────
-- Supports multi-user authentication.
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR(100) UNIQUE,
  display_name   VARCHAR(100) NOT NULL DEFAULT 'Demo User',
  email          VARCHAR(255) UNIQUE NOT NULL,
  password_hash  VARCHAR(255),
  email_verified BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── User OTPs ────────────────────────────────────────────────
-- Stores hashed temporary verification OTPs.
CREATE TABLE IF NOT EXISTS user_otps (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash    VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_otps_user_id ON user_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_user_otps_lookup ON user_otps(user_id, verified_at, expires_at);


-- ── Watchlists ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlists (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL DEFAULT 'My Watchlist',
  is_default BOOLEAN      NOT NULL DEFAULT FALSE,
  position   INTEGER      NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- ── Watchlist stocks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS watchlist_stocks (
  id           SERIAL PRIMARY KEY,
  watchlist_id INTEGER      NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  symbol       VARCHAR(20)  NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  exchange     VARCHAR(20)  NOT NULL DEFAULT 'NSE',
  position     INTEGER      NOT NULL DEFAULT 0,
  added_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (watchlist_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_stocks_watchlist_id
  ON watchlist_stocks(watchlist_id);

-- ── Market snapshots ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_snapshots (
  id                SERIAL PRIMARY KEY,
  symbol            VARCHAR(20)  NOT NULL,
  price             NUMERIC(12,4),
  change_percent    NUMERIC(8,4),
  previous_close    NUMERIC(12,4),
  day_high          NUMERIC(12,4),
  day_low           NUMERIC(12,4),
  market_data_ts    TIMESTAMPTZ,
  fetched_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_latest         BOOLEAN      NOT NULL DEFAULT TRUE,
  raw_data          JSONB
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_symbol
  ON market_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_symbol_latest
  ON market_snapshots(symbol, is_latest) WHERE is_latest = TRUE;

-- ── Index snapshots ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS index_snapshots (
  id             SERIAL PRIMARY KEY,
  index_symbol   VARCHAR(20)  NOT NULL,
  price          NUMERIC(12,4),
  change_percent NUMERIC(8,4),
  market_data_ts TIMESTAMPTZ,
  fetched_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_latest      BOOLEAN      NOT NULL DEFAULT TRUE,
  raw_data       JSONB
);

CREATE INDEX IF NOT EXISTS idx_index_snapshots_symbol_latest
  ON index_snapshots(index_symbol, is_latest) WHERE is_latest = TRUE;

-- ── User last-seen baselines ─────────────────────────────────
CREATE TABLE IF NOT EXISTS user_last_seen (
  id                       SERIAL PRIMARY KEY,
  user_id                  INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  watchlist_stock_id       INTEGER      NOT NULL REFERENCES watchlist_stocks(id) ON DELETE CASCADE,
  symbol                   VARCHAR(20)  NOT NULL,
  last_seen_price          NUMERIC(12,4),
  last_seen_index_change   NUMERIC(8,4),
  last_seen_market_data_ts TIMESTAMPTZ,
  last_seen_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_initial_baseline      BOOLEAN      NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, watchlist_stock_id)
);

CREATE INDEX IF NOT EXISTS idx_user_last_seen_user_id
  ON user_last_seen(user_id);
CREATE INDEX IF NOT EXISTS idx_user_last_seen_stock
  ON user_last_seen(user_id, watchlist_stock_id);

-- ── Pulse Universe (100 Benchmark Stocks Catalog) ─────────────
CREATE TABLE IF NOT EXISTS pulse_universe (
  id           SERIAL PRIMARY KEY,
  symbol       VARCHAR(20)  NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  exchange     VARCHAR(20)  NOT NULL DEFAULT 'NSE',
  index_group  VARCHAR(50)  NOT NULL,
  isin         VARCHAR(20)
);

-- ── Triggers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_watchlists_updated_at
  BEFORE UPDATE ON watchlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
