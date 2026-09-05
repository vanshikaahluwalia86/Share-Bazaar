const marketData      = require('../services/marketData');
const lastSeen        = require('../services/lastSeen');
const changeDetection = require('../services/changeDetection');
const db              = require('../db');


// ── Helper: get user id (authenticated or demo) ──────────────────────────────
function getUserId(req) {
  return req?.user ? req.user.id : parseInt(process.env.DEMO_USER_ID || '1', 10);
}

/**
 * GET /api/market/quote/:symbol?exchange=BSE
 *
 * Fetches a live quote for a single stock from Alpha Vantage.
 * Persists the snapshot to DB.
 * Returns price, change %, market-data timestamp, and freshness status.
 */
async function getQuote(req, res, next) {
  try {
    const symbol   = req.params.symbol.toUpperCase();
    const exchange = (req.query.exchange || 'BSE').toUpperCase();

    const quote = await marketData.getStockQuote(symbol, exchange);
    res.json({ quote });
  } catch (err) {
    // Surface the reason clearly — API errors, bad symbols, rate limits
    next(err);
  }
}

/**
 * GET /api/market/index/:indexId
 *
 * Fetches the current state of a market index.
 * indexId: "NIFTY_50" | "SENSEX"
 */
async function getIndex(req, res, next) {
  try {
    const indexId = (req.params.indexId || 'NIFTY_50').toUpperCase();
    const index   = await marketData.getIndexQuote(indexId);
    res.json({ index });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/market/refresh
 *
 * Refreshes market data for ALL stocks in the demo user's watchlist,
 * plus the default index (NIFTY 50).
 *
 * IMPORTANT: This does NOT update user_last_seen.
 * It only updates the market_snapshots table.
 * The last-seen baseline is only changed by explicit user actions.
 *
 * Returns an array of results (success or error per stock).
 */
async function refreshWatchlist(req, res, next) {
  try {
    const userId = getUserId(req);

    // Get all stocks in the user's watchlist
    const stocksResult = await db.query(
      `SELECT ws.id, ws.symbol, ws.exchange
       FROM watchlist_stocks ws
       JOIN watchlists wl ON ws.watchlist_id = wl.id
       WHERE wl.user_id = $1
       ORDER BY ws.added_at ASC`,
      [userId]
    );

    const stocks  = stocksResult.rows;
    const results = [];

    // Fetch each stock quote sequentially to respect Alpha Vantage's
    // rate limit of 5 calls/minute on the free tier.
    // For a hackathon demo (5-10 stocks), this is fine.
    for (const stock of stocks) {
      try {
        const quote = await marketData.getStockQuote(stock.symbol, stock.exchange);

        // ── INITIAL BASELINE ─────────────────────────────────────────────
        // If this stock has never been seen before, set its first baseline.
        // This only runs ONCE per stock — setInitialBaseline() is a no-op
        // if a record already exists. It will NOT overwrite an existing baseline.
        //
        // THIS IS THE ONLY PLACE where the baseline is set automatically.
        // All other updates require an explicit user action.
        await lastSeen.setInitialBaseline({
          userId,
          watchlistStockId: stock.id,
          symbol:           stock.symbol,
          price:            quote.price,
          indexChange:      null, // will be filled after index fetch below
          marketDataTs:     quote.marketDataTs,
        });

        results.push({ stockId: stock.id, symbol: stock.symbol, status: 'ok', quote });
      } catch (err) {
        // Don't fail the entire refresh if one stock errors —
        // log it and continue with the rest.
        console.error(`[Market] Failed to fetch ${stock.symbol}:`, err.message);
        results.push({
          stockId: stock.id,
          symbol:  stock.symbol,
          status:  'error',
          error:   err.message,
        });
      }
    }

    // Refresh the benchmark index FIRST so we can backfill index change
    // into any initial baselines that were set above with indexChange: null
    let indexResult = null;
    try {
      indexResult = await marketData.getIndexQuote(marketData.DEFAULT_INDEX);

      // Backfill: update any initial baselines that have null index change
      // (i.e., newly added stocks whose initial baseline was just set above)
      if (indexResult) {
        await db.query(
          `UPDATE user_last_seen
           SET last_seen_index_change = $1
           WHERE user_id = $2
             AND is_initial_baseline = TRUE
             AND last_seen_index_change IS NULL`,
          [indexResult.changePercent, userId]
        );
      }
    } catch (err) {
      console.error('[Market] Failed to fetch index:', err.message);
    }


    res.json({
      refreshedAt: new Date().toISOString(),
      stocks:      results,
      index:       indexResult,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/market/watchlist-snapshot
 *
 * Returns the most recently stored market data for all watchlist stocks
 * WITHOUT making any API calls. Fast — just reads from DB.
 *
 * Used by the dashboard to load the last-known market state instantly,
 * while the frontend can trigger a refresh separately.
 */
async function getWatchlistSnapshot(req, res, next) {
  try {
    const userId = getUserId(req);

    const result = await db.query(
      `SELECT
         ws.id          AS watchlist_stock_id,
         ws.symbol,
         ws.display_name,
         ws.exchange,
         ms.price,
         ms.change_percent,
         ms.previous_close,
         ms.market_data_ts,
         ms.fetched_at,
         -- last-seen baseline for change calculation
         uls.last_seen_price,
         uls.last_seen_index_change,
         uls.last_seen_market_data_ts,
         uls.last_seen_at,
         uls.is_initial_baseline
       FROM watchlist_stocks ws
       JOIN watchlists wl ON ws.watchlist_id = wl.id
       LEFT JOIN market_snapshots ms
         ON ms.symbol = ws.symbol AND ms.is_latest = TRUE
       LEFT JOIN user_last_seen uls
         ON uls.watchlist_stock_id = ws.id AND uls.user_id = $1
       WHERE wl.user_id = $1
       ORDER BY ws.added_at ASC`,
      [userId]
    );

    // Tag each row with freshness info
    const stocks = result.rows.map((row) => ({
      ...row,
      isStale:     marketData.isStale(row.market_data_ts),
      hasMarketData: row.price !== null,
    }));

    // Also get the latest stored index
    const indexRow = await marketData.getLatestStoredIndex();

    res.json({
      stocks,
      index: indexRow
        ? {
            indexId:      indexRow.index_symbol,
            price:        indexRow.price,
            changePercent: indexRow.change_percent,
            marketDataTs: indexRow.market_data_ts,
            isStale:      marketData.isStale(indexRow.market_data_ts),
          }
        : null,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/market/attention
 *
 * THE MAIN DASHBOARD ENDPOINT.
 *
 * Returns all watchlist stocks evaluated by the rule engine:
 *   - Attention level per stock: GREEN | YELLOW | RED
 *   - Signals that triggered the level (with values and thresholds)
 *   - Structured summary ready to be sent to AI for explanation
 *   - Sorted: RED first, then YELLOW, then GREEN
 *
 * Does NOT make any API calls — reads from DB only (fast).
 * Does NOT update user_last_seen.
 */
async function getAttention(req, res, next) {
  try {
    const userId = getUserId(req);

    const watchlistId = req.query.watchlist_id ? parseInt(req.query.watchlist_id, 10) : null;

    const result = await db.query(
      `SELECT
         ws.id          AS watchlist_stock_id,
         ws.symbol,
         ws.display_name,
         ws.exchange,
         ms.price,
         ms.change_percent,
         ms.previous_close,
         ms.day_high,
         ms.day_low,
         ms.market_data_ts,
         ms.fetched_at,
         uls.last_seen_price,
         uls.last_seen_index_change,
         uls.last_seen_market_data_ts,
         uls.last_seen_at,
         uls.is_initial_baseline
       FROM watchlist_stocks ws
       JOIN watchlists wl ON ws.watchlist_id = wl.id
       LEFT JOIN market_snapshots ms
         ON ms.symbol = ws.symbol AND ms.is_latest = TRUE
       LEFT JOIN user_last_seen uls
         ON uls.watchlist_stock_id = ws.id AND uls.user_id = $1
       WHERE wl.user_id = $1 ${watchlistId ? 'AND wl.id = $2' : ''}
       ORDER BY ws.position ASC, ws.added_at ASC`,
      watchlistId ? [userId, watchlistId] : [userId]
    );

    const stocks = result.rows.map((row) => ({
      ...row,
      isStale:      marketData.isStale(row.market_data_ts),
      hasMarketData: row.price !== null,
    }));

    const indexRow = await marketData.getLatestStoredIndex();
    const currentIndex = indexRow
      ? {
          indexId:       indexRow.index_symbol,
          price:         indexRow.price,
          changePercent: indexRow.change_percent,
          marketDataTs:  indexRow.market_data_ts,
          isStale:       marketData.isStale(indexRow.market_data_ts),
        }
      : null;

    // ── Run the rule engine ──────────────────────────────────────────────────
    const evaluated = changeDetection.evaluateWatchlist(stocks, currentIndex);

    // Count by attention level for a dashboard summary
    const counts = { RED: 0, YELLOW: 0, GREEN: 0 };
    for (const item of evaluated) counts[item.attentionLevel]++;

    res.json({
      evaluatedAt: new Date().toISOString(),
      summary: {
        total:  evaluated.length,
        red:    counts.RED,
        yellow: counts.YELLOW,
        green:  counts.GREEN,
      },
      index:   currentIndex,
      stocks:  evaluated,
    });
  } catch (err) {
    next(err);
  }
}

async function getIndexes(req, res, next) {
  try {
    const indexes = await marketData.getBothIndexes();
    res.json({
      timestamp: new Date().toISOString(),
      ...indexes,
    });
  } catch (err) {
    next(err);
  }
}

async function getNews(req, res, next) {
  try {
    const symbolsParam = req.query.symbols;
    const symbols = symbolsParam ? symbolsParam.split(',').map(s => s.trim()) : [];
    const upstox = require('../services/upstoxMarketData');

    const watchlistNews = await upstox.getNewsForSymbols(symbols);
    const generalNews   = await upstox.getGeneralMarketNews();

    res.json({
      fetchedAt: new Date().toISOString(),
      watchlistNews,
      generalNews,
    });
  } catch (err) {
    next(err);
  }
}

async function getCandles(req, res, next) {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const exchange = (req.query.exchange || 'NSE').toUpperCase();
    const timeframe = req.query.timeframe || '1D';

    const upstox = require('../services/upstoxMarketData');
    const result = await upstox.fetchUpstoxCandles(symbol, exchange, timeframe);

    res.json({
      symbol,
      exchange,
      timeframe,
      candles: result ? result.candles : null,
      source: result ? result.source : 'Fallback',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuote,
  getIndex,
  getIndexes,
  getCandles,
  getNews,
  refreshWatchlist,
  getWatchlistSnapshot,
  getAttention,
};
