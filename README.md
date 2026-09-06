# 📊 ShareBazaar

### Real-Time Market Intelligence & Baseline Analytics Engine

ShareBazaar is an intelligent stock watchlist designed to reduce information overload for retail investors.

Traditional watchlists show prices, percentage changes, volumes, and news — but leave the user to determine what actually matters.

**ShareBazaar adds context.**

It remembers the price of each stock when the user last checked, detects meaningful changes, evaluates them using a **7-Factor Market Impact Score**, and generates concise explanations to help users understand **what changed and why it matters**.

---

## 🚀 Key Idea

Instead of simply asking:

> **"What is the stock doing today?"**

ShareBazaar asks:

> **"What has changed since I last checked, how important is that change, and what is driving it?"**

### The core workflow

```text
Last Seen Baseline
        ↓
Meaningful Change Detection
        ↓
7-Factor Market Impact Score
        ↓
Attention Level
        ↓
AI Explanation
        ↓
User Acknowledges / Marks as Seen
        ↓
New Baseline
```

This transforms a traditional passive watchlist into an **active market intelligence dashboard**.

---

# ✨ Features

## 🔐 Authentication & OTP Verification

* User registration and login
* OTP-based verification
* Secure password hashing using `bcryptjs`
* Hashed OTP storage
* JWT-based authentication
* User-scoped watchlists and market data
* Persistent authentication state

---

## 📋 Multi-Watchlist Management

Create and manage multiple personalized watchlists.

Users can:

* Create watchlists
* Rename watchlists
* Delete watchlists
* Set a default watchlist
* Switch between watchlists using tabs
* Add and remove stocks independently

New users automatically receive a default **My Watchlist**.

---

## 🔎 Stock Discovery & Pulse Universe

ShareBazaar includes a benchmark stock catalog containing **100 stocks**, including NIFTY 50 constituents and other key market names.

Users can:

* Search stocks
* Browse the Pulse Universe
* Quickly add stocks
* Add stocks directly from the watchlist interface

---

# 🧠 7-Factor Market Impact Score

The core intelligence engine evaluates stock movements using seven weighted factors.

| Factor                        |   Weight |
| ----------------------------- | -------: |
| Price Anomaly                 |      25% |
| Volume Anomaly                |      20% |
| Relative Performance vs NIFTY |      15% |
| News Impact                   |      15% |
| Corporate Event               |      10% |
| Catalyst Proximity            |      10% |
| Data Confidence               |       5% |
| **Total**                     | **100%** |

The resulting score ranges from **0–100**.

### Attention Levels

```text
🔴 RED
Score ≥ 70
High Impact

🟡 YELLOW
Score 40–69
Medium Impact

🟢 GREEN
Score < 40
Low Impact
```

The score is deterministic and designed to prioritize meaningful market movements instead of relying on a single percentage-change metric.

---

# 🕐 Last-Seen Baseline Tracking

One of ShareBazaar's key differentiators is **personalized baseline tracking**.

Instead of comparing a stock only against the previous trading session, ShareBazaar maintains a user-specific snapshot of the stock price from the user's last observation.

### Example

```text
User last checked:
RELIANCE = ₹1,420

User returns later:
RELIANCE = ₹1,475

Baseline change:
+3.87%
```

This allows the application to answer:

> **"What changed since I last looked?"**

The system also calculates relative performance against NIFTY 50, allowing users to distinguish between:

* Stock-specific movement
* Broader market movement

---

# 👁️ Mark as Seen

Once a user has reviewed an important stock movement, they can click **Mark as Seen**.

This:

1. Updates the user's baseline
2. Stores the current market price
3. Clears the current attention state
4. Allows future changes to be measured from the new baseline

### Core loop

```text
Detect → Review → Mark as Seen → Reset Baseline → Detect Again
```

---

# 🤖 AI Market Explanations

ShareBazaar includes an AI-powered explanation layer for important stock movements.

When the user selects **AI Insight**, the system generates a concise **two-sentence explanation** based on the available market signals.

The purpose is not to produce a lengthy financial report.

Instead, the AI converts complex signals into a short, understandable narrative.

### Example flow

```text
Market Signals
      ↓
Impact Score
      ↓
Context
      ↓
AI Explanation
      ↓
2-Sentence Insight
```

The AI layer uses **OpenAI GPT-4o-mini**.

A deterministic fallback explanation generator is also available when the AI service is unavailable or an API request fails.

---

# 📈 Interactive Stock Charts

ShareBazaar provides a full-screen interactive stock chart.

Supported timeframes:

* **1D** — 1 Day
* **1W** — 1 Week
* **1M** — 1 Month
* **1Y** — 1 Year
* **ALL** — Full available history

The chart provides:

* Interactive tooltips
* Price history
* Peak high
* Low
* Volume
* Percentage gain

This allows users to move from a high-level attention signal into deeper historical analysis.

---

# 📰 Market News

ShareBazaar integrates market news directly into the dashboard.

Users can view:

* Watchlist-specific news
* General market news
* Relevant market developments

This adds qualitative context alongside quantitative market signals.

---

# 📊 Market Overview

The Home dashboard provides high-level market telemetry including:

* NIFTY 50
* SENSEX
* Top market movers
* Market summary
* News feed

A dynamic ticker continuously surfaces notable market movements.

---

# 🔄 Multi-Tier Market Data Resilience

ShareBazaar is designed to remain functional even when the primary market-data provider is unavailable.

### Data hierarchy

```text
             ┌──────────────────┐
             │   Upstox API v2   │
             └────────┬─────────┘
                      │
                unavailable
                      ↓
             ┌──────────────────┐
             │ PostgreSQL       │
             │ Latest Snapshot  │
             └────────┬─────────┘
                      │
                unavailable
                      ↓
             ┌──────────────────┐
             │ Mock Market Data │
             │    Generator     │
             └──────────────────┘
```

### Tier 1 — Live Market Data

Uses **Upstox API v2**.

### Tier 2 — Stored Snapshots

Falls back to the latest available PostgreSQL market snapshot.

### Tier 3 — Mock Market Data

Uses a real-time mock generator to keep the application demonstrable when external data is unavailable.

The system also identifies data as **stale** when the available data is older than 24 hours.

---

# 🌗 Dark & Light Mode

ShareBazaar supports both:

* Dark Mode
* Light Mode

The theme uses CSS custom-property tokens and persists the user's preference locally.

---

# 📋 Dual Watchlist Views

Users can switch between two ways of viewing their stocks.

### Cards View

Provides a visual attention-oriented layout focused on:

* Impact level
* Price movement
* Relative performance
* Important signals
* AI insights

### Detailed Table View

Provides a denser analytical representation of watchlist data.

---

# ⚙️ Customizable Table Columns

Users can customize which columns appear in the detailed table.

Column preferences are persisted locally, allowing the interface to remain consistent between sessions.

---

# 🏗️ Technology Stack

## Frontend

* **React 18**
* **Vite 5**
* **Vanilla CSS**
* **CSS Custom Properties**
* Browser `localStorage`

### Key Frontend Components

```text
App.jsx
Navbar.jsx
HomeTab.jsx
WatchlistTab.jsx
WatchlistTabs.jsx
AttentionSection.jsx
AttentionCard.jsx
DetailedTableView.jsx
StockChartModal.jsx
PulseUniverseModal.jsx
ColumnCustomizerModal.jsx
NewsFeed.jsx
IndexHeaderCards.jsx
TickerCarousel.jsx
AuthPage.jsx
AddStockForm.jsx
MarketSummary.jsx
FreshnessIndicator.jsx
```

---

## Backend

* **Node.js**
* **Express.js**
* **REST APIs**

### Main backend structure

```text
server.js

routes/
├── auth.js
├── watchlist.js
├── market.js
└── ai.js

services/
├── changeDetection.js
├── lastSeen.js
├── marketData.js
├── upstoxMarketData.js
├── mockMarketData.js
├── aiExplanation.js
└── authService.js

db/
├── schema.sql
├── auth_migration.sql
└── pulse_universe.sql
```

---

# 🗄️ Database

ShareBazaar uses **PostgreSQL** with the `pgcrypto` extension.

The database handles:

* Users
* OTP records
* Watchlists
* Watchlist stocks
* User-specific stock baselines
* Market snapshots
* Pulse Universe stock catalog

### Important database concepts

```text
users
user_otps
watchlists
watchlist_stocks
user_last_seen
market_snapshots
pulse_universe
```

---

# 🔌 API Architecture

The backend is organized around REST APIs.

### Authentication

```text
/api/auth/*
```

Handles:

* Registration
* Login
* OTP verification
* Authentication

### Watchlists

```text
/api/watchlists/*
```

Handles:

* Creating watchlists
* Updating watchlists
* Deleting watchlists
* Adding stocks
* Removing stocks
* Marking stocks as seen

### Market

```text
/api/market/*
```

Handles:

* Market data
* Stock information
* Market summaries
* Index information

### AI

```text
/api/ai/*
```

Handles:

* AI-generated stock explanations

---

# 🔁 Application Architecture

```text
                         SHAREBAZAAR
                              │
                 ┌────────────┴────────────┐
                 │                         │
             React 18                Node.js + Express
                 │                         │
        ┌────────┴────────┐         ┌──────┴────────┐
        │                 │         │               │
    Dashboard         Watchlists   Auth           Market
        │                 │         │               │
        └────────┬────────┘         │               │
                 │                  │               │
                 └──────────┬──────┴───────────────┘
                            │
                            ▼
                       PostgreSQL
                            │
              ┌─────────────┴─────────────┐
              │                           │
       User Baselines              Market Snapshots
              │
              ▼
     7-Factor Scoring Engine
              │
              ▼
      RED / YELLOW / GREEN
              │
              ▼
       AI Explanation Layer
              │
              ▼
        User Understanding
```

---

# ⏱️ Market Data Refresh

Market information is refreshed through **background polling every 15 seconds**.

This provides near-real-time updates while keeping the architecture simple and resilient without relying on a persistent WebSocket connection.

---

# 💾 Local Persistence

The frontend stores selected user preferences and session information using browser `localStorage`.

Key storage entries include:

```text
sharebazaar_theme
smart_watchlist_cols
smw_auth_token
```

This allows:

* Theme persistence
* Table customization persistence
* Authentication state persistence

---

# 🛡️ Resilience & Reliability

ShareBazaar is designed so that individual external service failures do not completely break the user experience.

### Resilience principles

* External market-data fallback
* PostgreSQL snapshots
* Mock market-data generator
* AI fallback narrative
* Automatic stale-data identification
* Persistent user baselines

The goal is to ensure that the application remains useful and demonstrable even when external dependencies experience failures.

---

# 🎯 Product Philosophy

ShareBazaar is built around three principles:

### 1. Context Over Numbers

A percentage change alone doesn't tell the investor whether a movement matters.

### 2. Signal Over Noise

Users shouldn't have to manually inspect every stock in their watchlist.

### 3. Explanation Over Complexity

Complex market signals should ultimately become understandable information.

---

# 🔑 What Makes ShareBazaar Different?

Traditional watchlist:

```text
Stock
 ↓
Price
 ↓
% Change
 ↓
Investor decides what matters
```

ShareBazaar:

```text
Stock
 ↓
Last Seen Baseline
 ↓
Meaningful Change Detection
 ↓
7-Factor Impact Score
 ↓
Attention Level
 ↓
AI Explanation
 ↓
Investor understands what changed
```

The product therefore moves the watchlist from **passive tracking** toward **personalized market intelligence**.

---

# 🚀 Getting Started

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* PostgreSQL

---

## Clone the Repository

```bash
git clone <your-repository-url>
cd sharebazaar
```

---

## Install Dependencies

### Frontend

```bash
npm install
```

### Backend

If the backend is maintained separately:

```bash
cd backend
npm install
```

---

# 🔐 Environment Variables

Create the appropriate `.env` file for the backend.

Example configuration:

```env
PORT=5000

DATABASE_URL=your_postgresql_connection_string

JWT_SECRET=your_jwt_secret

UPSTOX_CLIENT_ID=your_upstox_client_id
UPSTOX_CLIENT_SECRET=your_upstox_client_secret

OPENAI_API_KEY=your_openai_api_key
```

> Never commit real API keys, database passwords, JWT secrets, or other credentials to the repository.

---

# 🗃️ Database Setup

Create a PostgreSQL database and execute the SQL files in the `db/` directory.

The database setup includes:

```text
schema.sql
auth_migration.sql
pulse_universe.sql
```

These initialize the application schema, authentication tables, and benchmark stock catalog.

---

# ▶️ Running the Application

Start the backend:

```bash
npm run server
```

Start the frontend:

```bash
npm run dev
```

Then open the local development URL shown by Vite.

---

# 📁 Project Structure

```text
sharebazaar/
│
├── src/
│   ├── components/
│   ├── App.jsx
│   └── ...
│
├── server/
│   ├── routes/
│   ├── services/
│   ├── db/
│   └── server.js
│
├── package.json
├── vite.config.js
└── README.md
```

> Adjust the structure above if your repository uses different frontend/backend directory names.

---

# 🧪 Core User Journey

A typical ShareBazaar session looks like:

```text
1. Login
   ↓
2. View market overview
   ↓
3. Open personal watchlist
   ↓
4. Review attention levels
   ↓
5. Identify meaningful changes
   ↓
6. Compare performance against NIFTY
   ↓
7. Read AI Insight
   ↓
8. Open interactive chart
   ↓
9. Understand the movement
   ↓
10. Mark as Seen
   ↓
11. Establish new baseline
```

---

# 🔮 Future Improvements

Potential future enhancements include:

* Live corporate-action calendar integration
* More advanced event detection
* Personalized alert preferences
* Additional market indices
* More granular sector-level analytics
* Historical impact-score analytics
* Advanced portfolio integrations
* Real-time streaming market infrastructure

---

# ⚠️ Disclaimer

ShareBazaar is a software project designed for market-information visualization and analytics.

It does **not** execute trades or provide personalized financial advice.

Market data may be delayed, simulated, stale, or unavailable depending on the configured data source.

Users should independently verify financial information before making investment decisions.

---

# 📜 License

Add the project's applicable license here.

Example:

```text
MIT License
```

---

# ⭐ ShareBazaar

**Don't just watch the market. Know what changed.**

> **ShareBazaar turns a passive stock watchlist into a personalized market intelligence engine that remembers what you saw, identifies what matters, and explains why.**
