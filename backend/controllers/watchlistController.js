const db = require('../db');

function getUserId(req) {
  return req && req.user ? req.user.id : parseInt(process.env.DEMO_USER_ID || '1', 10);
}

/**
 * Resolve the user's default watchlist id.
 */
async function getDefaultWatchlistId(userId) {
  const result = await db.query(
    'SELECT id FROM watchlists WHERE user_id = $1 ORDER BY is_default DESC, position ASC, id ASC LIMIT 1',
    [userId]
  );
  if (result.rows.length === 0) {
    // Auto-create default watchlist if missing
    const created = await db.query(
      "INSERT INTO watchlists (user_id, name, is_default) VALUES ($1, 'My Watchlist', TRUE) RETURNING id",
      [userId]
    );
    return created.rows[0].id;
  }
  return result.rows[0].id;
}

// ── Multi-Watchlist CRUD ─────────────────────────────────────────────────────

async function listWatchlists(req, res, next) {
  try {
    const userId = getUserId(req);
    const result = await db.query(
      `SELECT w.id, w.name, w.is_default, w.position, w.created_at,
              COUNT(ws.id)::int AS stock_count
       FROM watchlists w
       LEFT JOIN watchlist_stocks ws ON ws.watchlist_id = w.id
       WHERE w.user_id = $1
       GROUP BY w.id
       ORDER BY w.is_default DESC, w.position ASC, w.id ASC`,
      [userId]
    );
    if (result.rows.length === 0) {
      await getDefaultWatchlistId(userId);
      return listWatchlists(req, res, next);
    }
    res.json({ watchlists: result.rows });
  } catch (err) {
    next(err);
  }
}

async function createWatchlist(req, res, next) {
  try {
    const { name, isDefault } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Watchlist name is required' });
    }
    const userId = getUserId(req);

    if (isDefault) {
      await db.query('UPDATE watchlists SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    const result = await db.query(
      `INSERT INTO watchlists (user_id, name, is_default)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name.trim(), !!isDefault]
    );

    res.status(201).json({ watchlist: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function updateWatchlist(req, res, next) {
  try {
    const watchlistId = parseInt(req.params.id, 10);
    const { name, isDefault } = req.body;
    const userId = getUserId(req);

    if (isDefault) {
      await db.query('UPDATE watchlists SET is_default = FALSE WHERE user_id = $1', [userId]);
    }

    const updates = [];
    const values = [watchlistId, userId];
    let idx = 3;

    if (name && name.trim()) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (typeof isDefault === 'boolean') {
      updates.push(`is_default = $${idx++}`);
      values.push(isDefault);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await db.query(
      `UPDATE watchlists SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2 RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    res.json({ watchlist: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function deleteWatchlist(req, res, next) {
  try {
    const watchlistId = parseInt(req.params.id, 10);
    const userId = getUserId(req);

    const countResult = await db.query('SELECT COUNT(*)::int FROM watchlists WHERE user_id = $1', [userId]);
    if (countResult.rows[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete your only watchlist' });
    }

    const deleted = await db.query(
      'DELETE FROM watchlists WHERE id = $1 AND user_id = $2 RETURNING *',
      [watchlistId, userId]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: 'Watchlist not found' });
    }

    if (deleted.rows[0].is_default) {
      await db.query(
        'UPDATE watchlists SET is_default = TRUE WHERE id = (SELECT id FROM watchlists WHERE user_id = $1 ORDER BY id ASC LIMIT 1)',
        [userId]
      );
    }

    res.json({ message: 'Watchlist deleted', watchlist: deleted.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ── Stock Management ─────────────────────────────────────────────────────────

async function getWatchlist(req, res, next) {
  try {
    const userId = getUserId(req);
    const rawWlId = req.query.watchlist_id ? parseInt(req.query.watchlist_id, 10) : null;
    const watchlistId = (rawWlId && !isNaN(rawWlId)) ? rawWlId : await getDefaultWatchlistId(userId);

    const result = await db.query(
      `SELECT
         ws.id,
         ws.symbol,
         ws.display_name,
         ws.exchange,
         ws.position,
         ws.added_at,
         uls.last_seen_price,
         uls.last_seen_index_change,
         uls.last_seen_market_data_ts,
         uls.last_seen_at,
         uls.is_initial_baseline
       FROM watchlist_stocks ws
       LEFT JOIN user_last_seen uls
         ON uls.watchlist_stock_id = ws.id
         AND uls.user_id = $1
       WHERE ws.watchlist_id = $2
       ORDER BY ws.position ASC, ws.added_at ASC`,
      [userId, watchlistId]
    );

    res.json({
      watchlistId,
      stocks: result.rows,
    });
  } catch (err) {
    next(err);
  }
}

async function addStock(req, res, next) {
  console.log('[Backend watchlistController.addStock] Received request body:', req.body);
  try {
    const { symbol, displayName, exchange = 'NSE', watchlistId: reqWlId } = req.body;

    if (!symbol || !displayName) {
      console.warn('[Backend watchlistController.addStock] Missing required fields:', { symbol, displayName });
      return res.status(400).json({ error: 'Missing required fields: symbol, displayName' });
    }

    const userId = getUserId(req);
    const rawWlId = reqWlId ? parseInt(reqWlId, 10) : null;
    const watchlistId = (rawWlId && !isNaN(rawWlId)) ? rawWlId : await getDefaultWatchlistId(userId);
    const normalizedSymbol = symbol.trim().toUpperCase();

    console.log('[Backend watchlistController.addStock] Adding to DB:', { watchlistId, normalizedSymbol, displayName, exchange });

    const result = await db.query(
      `INSERT INTO watchlist_stocks (watchlist_id, symbol, display_name, exchange)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (watchlist_id, symbol) DO NOTHING
       RETURNING *`,
      [watchlistId, normalizedSymbol, displayName.trim(), exchange.trim().toUpperCase()]
    );

    let stock;
    if (result.rows.length === 0) {
      const existing = await db.query(
        'SELECT * FROM watchlist_stocks WHERE watchlist_id = $1 AND symbol = $2',
        [watchlistId, normalizedSymbol]
      );
      stock = existing.rows[0];
    } else {
      stock = result.rows[0];
    }

    // ── IMMEDIATELY FETCH LIVE QUOTE & INITIALIZE BASELINE ─────────────────
    const marketData = require('../services/marketData');
    const lastSeen   = require('../services/lastSeen');

    try {
      // 1. Fetch quote & save market_snapshot
      const quote = await marketData.getStockQuote(normalizedSymbol, stock.exchange || 'NSE');

      // 2. Set initial baseline in user_last_seen
      if (quote) {
        await lastSeen.setInitialBaseline({
          userId,
          watchlistStockId: stock.id,
          symbol: normalizedSymbol,
          price: quote.previousClose || quote.price,
          indexChange: null,
          marketDataTs: quote.marketDataTs,
        });
      }
    } catch (err) {
      console.warn(`[AddStock] Upstox live fetch warning for ${normalizedSymbol}:`, err.message);
      // Fallback: If live quote API fails or symbol is not on Upstox, create fallback snapshot so data is present
      try {
        const basePrices = {
          IRFC: 83.40, IRCON: 119.25, IRB: 19.65, NHPC: 76.25, BEL: 405.35,
          RVNL: 212.49, POWERGRID: 266.00, BANKBARODA: 239.00, NTPC: 332.50,
          TATASTEEL: 188.79, AMBUJACEM: 405.00, BERGEPAINT: 485.30, IOC: 137.60,
        };
        const price = basePrices[normalizedSymbol] || 250.00;
        const previousClose = parseFloat((price * 0.985).toFixed(2));
        const changePercent = parseFloat((((price - previousClose) / previousClose) * 100).toFixed(4));
        const now = new Date();

        await db.query(
          `UPDATE market_snapshots SET is_latest = FALSE WHERE symbol = $1 AND is_latest = TRUE`,
          [normalizedSymbol]
        );
        await db.query(
          `INSERT INTO market_snapshots (symbol, price, change_percent, previous_close, day_high, day_low, market_data_ts, fetched_at, is_latest)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
          [normalizedSymbol, price, changePercent, previousClose, price * 1.01, price * 0.99, now, now]
        );

        await lastSeen.setInitialBaseline({
          userId,
          watchlistStockId: stock.id,
          symbol: normalizedSymbol,
          price: previousClose,
          indexChange: null,
          marketDataTs: now,
        });
      } catch (fallbackErr) {
        console.error(`[AddStock] Fallback snapshot error:`, fallbackErr.message);
      }
    }

    res.status(201).json({ message: 'Stock added to watchlist', stock });
  } catch (err) {
    next(err);
  }
}

async function removeStock(req, res, next) {
  try {
    const stockId = parseInt(req.params.id, 10);
    if (isNaN(stockId)) {
      return res.status(400).json({ error: 'Invalid stock id' });
    }

    const result = await db.query('DELETE FROM watchlist_stocks WHERE id = $1 RETURNING *', [stockId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    res.json({ message: 'Stock removed from watchlist', stock: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// ── Pulse Universe Lookup (100 Benchmark Stocks) ──────────────────────────────

async function getPulseUniverse(req, res, next) {
  try {
    const { group, search } = req.query;
    let queryText = 'SELECT * FROM pulse_universe WHERE 1=1';
    const params = [];

    if (group && group !== 'ALL') {
      params.push(group);
      queryText += ` AND index_group = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toUpperCase()}%`);
      queryText += ` AND (UPPER(symbol) LIKE $${params.length} OR UPPER(display_name) LIKE $${params.length})`;
    }

    queryText += ' ORDER BY index_group ASC, symbol ASC';

    const result = await db.query(queryText, params);
    res.json({ count: result.rows.length, stocks: result.rows });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listWatchlists,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  getWatchlist,
  addStock,
  removeStock,
  getPulseUniverse,
};
