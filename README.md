# Smart Market Watchlist

> **"Don't make me scan my watchlist. Tell me what changed and what deserves my attention."**

A hackathon MVP built for the Groww problem statement.

## Architecture

```
smart-market-watchlist/
├── frontend/          # React + Vite (port 5173)
└── backend/           # Node.js + Express (port 3001)
    ├── routes/
    ├── controllers/
    ├── services/
    └── db/
```

## Quick Start

### 1. Prerequisites
- Node.js ≥ 18
- PostgreSQL 14+
- (Later phases) OpenAI API key + Alpha Vantage API key

### 2. Database setup

```bash
# Create the database
createdb smart_watchlist

# Run the schema
psql -d smart_watchlist -f backend/db/schema.sql

# Seed demo data
psql -d smart_watchlist -f backend/db/seed.sql
```

### 3. Backend

```bash
cd backend
cp .env.example .env          # Fill in your values
npm install
npm run dev
# → http://localhost:3001
# → Health: http://localhost:3001/api/health
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Key Concepts

### Last-seen baseline
The most important feature. For every user+stock pair, the database stores the price and metrics from the moment the user **intentionally** viewed that stock.

- ✅ Updated when: user opens stock details, clicks "Mark as Seen"
- ❌ NOT updated by: page refreshes, background polling, automatic fetches

### Rule engine (deterministic)
Compares current market state against the user's last-seen baseline.
Assigns **GREEN / YELLOW / RED** attention levels.
Thresholds are configurable in one place.

### AI explanation (narrative only)
Converts the rule engine's numerical facts into a short plain-English sentence.
Does **not** predict, advise, or invent reasons.

## Build Phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Scaffolding & dependencies | ✅ Done |
| 2 | PostgreSQL schema | ✅ Done |
| 3 | Watchlist CRUD API | ✅ Done |
| 4 | Market-data service | ✅ Done |
| 5 | Last-seen baseline system | ✅ Done |
| 6 | Rule engine | ✅ Done |
| **Auth** | **Authentication (Register, OTP, Login, JWT)** | **✅ Done** |
| 7 | Attention-card frontend | ✅ Done |
| 8 | Freshness / stale-data handling | ✅ Done |
| 9 | AI explanation | ⏳ Next |
| 10 | End-to-end testing | ⏳ |
| 11 | Git / GitHub | ⏳ |
| 12 | Deployment | ⏳ |
