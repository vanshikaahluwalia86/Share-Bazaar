const lastSeenService = require('../services/lastSeen');

function getUserId(req) {
  return req?.user ? req.user.id : parseInt(process.env.DEMO_USER_ID || '1', 10);
}

/**
 * POST /api/watchlist/stocks/:id/acknowledge
 *
 * Called when the user intentionally opens an attention card / stock detail.
 * Updates the last-seen baseline to the current market snapshot.
 *
 * This is the PRIMARY way the baseline advances after the initial one.
 *
 * NEVER call this from a GET endpoint.
 * NEVER call this from background refresh logic.
 */
async function acknowledgeStock(req, res, next) {
  try {
    const userId = getUserId(req);
    const watchlistStockId = parseInt(req.params.id, 10);

    if (isNaN(watchlistStockId)) {
      return res.status(400).json({ error: 'Invalid stock id' });
    }

    const record = await lastSeenService.acknowledgeStock(userId, watchlistStockId);

    res.json({
      message:  'Stock acknowledged — last-seen baseline updated',
      lastSeen: record,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/watchlist/stocks/:id/mark-seen
 *
 * Called when the user explicitly clicks "Mark as Seen".
 * Identical effect to acknowledge — separate route for UI clarity.
 */
async function markAsSeen(req, res, next) {
  try {
    const userId = getUserId(req);
    const watchlistStockId = parseInt(req.params.id, 10);

    if (isNaN(watchlistStockId)) {
      return res.status(400).json({ error: 'Invalid stock id' });
    }

    const record = await lastSeenService.markAsSeen(userId, watchlistStockId);

    res.json({
      message:  'Marked as seen — last-seen baseline updated',
      lastSeen: record,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/watchlist/stocks/:id/last-seen
 *
 * Returns the last-seen snapshot for a specific stock.
 * Read-only — does NOT update anything.
 */
async function getLastSeen(req, res, next) {
  try {
    const userId = getUserId(req);
    const watchlistStockId = parseInt(req.params.id, 10);

    if (isNaN(watchlistStockId)) {
      return res.status(400).json({ error: 'Invalid stock id' });
    }

    const record = await lastSeenService.getLastSeen(userId, watchlistStockId);

    if (!record) {
      return res.status(404).json({
        error: 'No last-seen baseline exists for this stock yet. ' +
               'Fetch market data first.',
      });
    }

    res.json({ lastSeen: record });
  } catch (err) {
    next(err);
  }
}

module.exports = { acknowledgeStock, markAsSeen, getLastSeen };
