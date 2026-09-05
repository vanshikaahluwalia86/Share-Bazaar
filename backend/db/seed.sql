-- ============================================================
-- Smart Market Watchlist — Seed data
-- Creates the demo user and their default watchlist.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).
-- ============================================================

-- Demo user (id = 1, used until authentication is implemented)
INSERT INTO users (id, display_name, email)
VALUES (1, 'Demo User', 'demo@smartwatchlist.local')
ON CONFLICT (id) DO NOTHING;

-- Reset the sequence so future inserts don't collide with id=1
SELECT setval('users_id_seq', 1, true);

-- Default watchlist for the demo user
INSERT INTO watchlists (user_id, name)
VALUES (1, 'My Watchlist')
ON CONFLICT (user_id, name) DO NOTHING;
