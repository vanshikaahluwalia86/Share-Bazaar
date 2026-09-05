/**
 * lastSeen.js
 *
 * Service responsible for ALL mutations to the user_last_seen table.
 *
 * ════════════════════════════════════════════════════════════════════
 *  INVARIANT — enforced here and only here:
 *
 *  user_last_seen IS updated by:
 *    1. setInitialBaseline()  — one-time, when a new stock's first
 *                               valid market snapshot arrives
 *    2. acknowledgeStock()    — user intentionally opens attention card
 *    3. markAsSeen()          — user clicks "Mark as Seen"
 *
 *  user_last_seen is NEVER updated by:
 *    - Dashboard refresh / page load
 *    - Background market-data fetching
 *    - POST /api/market/refresh
 *    - Any GET request
 * ════════════════════════════════════════════════════════════════════
 */

const db = require('../db');

// ── Internal helper ──────────────────────────────────────────────────────────

/**
 * Writes (upserts) a last-seen record.
 * All public functions funnel through here to keep the logic in one place.
 *
 * @param {object} params
 * @param {number}  params.userId
 * @param {number}  params.watchlistStockId
 * @param {string}  params.symbol
 * @param {number}  params.price               - Stock price at moment of viewing
 * @param {number}  params.indexChangePercent  - Index change% at that moment
 * @param {Date}    params.marketDataTs        - Market-data timestamp of the snapshot
 * @param {boolean} params.isInitialBaseline   - TRUE only for the first-ever snapshot
 */
async function upsertLastSeen({
  userId,
  watchlistStockId,
  symbol,
  price,
  indexChangePercent,
  marketDataTs,
  isInitialBaseline = false,
}) {
  const result = await db.query(
    `INSERT INTO user_last_seen
       (user_id, watchlist_stock_id, symbol,
        last_seen_price, last_seen_index_change, last_seen_market_data_ts,
        last_seen_at, is_initial_baseline)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
     ON CONFLICT (user_id, watchlist_stock_id)
     DO UPDATE SET
       last_seen_price          = EXCLUDED.last_seen_price,
       last_seen_index_change   = EXCLUDED.last_seen_index_change,
       last_seen_market_data_ts = EXCLUDED.last_seen_market_data_ts,
       last_seen_at             = NOW(),
       -- Once is_initial_baseline is FALSE (a real acknowledgement),
       -- never set it back to TRUE even if this function is called again.
       is_initial_baseline      = CASE
         WHEN user_last_seen.is_initial_baseline = FALSE THEN FALSE
         ELSE EXCLUDED.is_initial_baseline
       END
     RETURNING *`,
    [
      userId,
      watchlistStockId,
      symbol,
      price,
      indexChangePercent,
      marketDataTs,
      isInitialBaseline,
    ]
  );
  return result.rows[0];
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Sets the INITIAL baseline for a newly added stock.
 *
 * Called ONCE when a new watchlist stock receives its first valid
 * market snapshot. After this call, the stock has a valid comparison
 * point and the rule engine can start working.
 *
 * If a record already exists for this user+stock, this is a no-op.
 *
 * @param {object} params
 * @param {number}  params.userId
 * @param {number}  params.watchlistStockId
 * @param {string}  params.symbol
 * @param {number}  params.price            - From the first valid market snapshot
 * @param {number}  params.indexChange      - Current NIFTY change% at time of first fetch
 * @param {Date}    params.marketDataTs     - Market-data timestamp
 * @returns {object|null} - The created record, or null if one already existed
 */
async function setInitialBaseline({
  userId,
  watchlistStockId,
  symbol,
  price,
  indexChange,
  marketDataTs,
}) {
  // Check if a baseline already exists — if so, don't overwrite it
  const existing = await db.query(
    'SELECT id FROM user_last_seen WHERE user_id = $1 AND watchlist_stock_id = $2',
    [userId, watchlistStockId]
  );

  if (existing.rows.length > 0) {
    // Baseline already set — leave it alone
    return null;
  }

  console.log(`[LastSeen] Setting initial baseline for ${symbol} (user ${userId})`);

  return upsertLastSeen({
    userId,
    watchlistStockId,
    symbol,
    price,
    indexChangePercent: indexChange,
    marketDataTs,
    isInitialBaseline: true,
  });
}

/**
 * Records that the user has intentionally ACKNOWLEDGED a stock change.
 *
 * Called when:
 *   - User opens the attention card / stock detail
 *   - (NOT called on page refresh or background data fetch)
 *
 * Uses the current latest market snapshot as the new baseline.
 *
 * @param {number} userId
 * @param {number} watchlistStockId
 * @returns {object} - The updated last-seen record
 */
async function acknowledgeStock(userId, watchlistStockId) {
  // Get the current market snapshot for this stock
  const stockResult = await db.query(
    `SELECT ws.symbol, ws.exchange, ms.price, ms.market_data_ts
     FROM watchlist_stocks ws
     LEFT JOIN market_snapshots ms
       ON ms.symbol = ws.symbol AND ms.is_latest = TRUE
     WHERE ws.id = $1`,
    [watchlistStockId]
  );

  if (stockResult.rows.length === 0) {
    throw new Error(`Watchlist stock ${watchlistStockId} not found`);
  }

  const stock = stockResult.rows[0];

  if (!stock.price) {
    throw new Error(
      `No market data available for ${stock.symbol} yet. ` +
      `Fetch market data first before acknowledging.`
    );
  }

  // Get the current index snapshot for the relative baseline
  const indexResult = await db.query(
    `SELECT change_percent FROM index_snapshots
     WHERE is_latest = TRUE
     ORDER BY fetched_at DESC
     LIMIT 1`
  );

  const indexChange = indexResult.rows[0]?.change_percent ?? null;

  console.log(
    `[LastSeen] Acknowledging ${stock.symbol} for user ${userId} ` +
    `at price ${stock.price}`
  );

  return upsertLastSeen({
    userId,
    watchlistStockId,
    symbol:            stock.symbol,
    price:             parseFloat(stock.price),
    indexChangePercent: indexChange !== null ? parseFloat(indexChange) : null,
    marketDataTs:      stock.market_data_ts,
    isInitialBaseline: false, // This is an intentional user action, not an initial baseline
  });
}

/**
 * "Mark as Seen" — identical effect to acknowledgeStock.
 * Separated as a named alias so the code reads clearly at call sites.
 *
 * @param {number} userId
 * @param {number} watchlistStockId
 * @returns {object} - The updated last-seen record
 */
async function markAsSeen(userId, watchlistStockId) {
  // Same logic as acknowledge — just a named alias for the explicit button action
  return acknowledgeStock(userId, watchlistStockId);
}

/**
 * Returns the current last-seen record for a user+stock pair.
 * Returns null if no baseline has been set yet.
 */
async function getLastSeen(userId, watchlistStockId) {
  const result = await db.query(
    `SELECT * FROM user_last_seen
     WHERE user_id = $1 AND watchlist_stock_id = $2`,
    [userId, watchlistStockId]
  );
  return result.rows[0] || null;
}

module.exports = {
  setInitialBaseline,
  acknowledgeStock,
  markAsSeen,
  getLastSeen,
};
