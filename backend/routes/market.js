const express = require('express');
const router  = express.Router();
const mc      = require('../controllers/marketController');

// GET  /api/market/quote/:symbol?exchange=BSE   → live quote for one stock
router.get('/quote/:symbol', mc.getQuote);

// GET  /api/market/indexes                      → live NIFTY 50 & SENSEX quotes
router.get('/indexes', mc.getIndexes);

// GET  /api/market/index/:indexId               → live index quote (NIFTY_50 | SENSEX)
router.get('/index/:indexId', mc.getIndex);

// GET  /api/market/candles/:symbol              → live Upstox historical / intraday candle charts
router.get('/candles/:symbol', mc.getCandles);

// GET  /api/market/news                         → news stream for watchlist + market
router.get('/news', mc.getNews);

// POST /api/market/refresh                      → refresh all watchlist stocks + index
router.post('/refresh', mc.refreshWatchlist);

// GET  /api/market/watchlist-snapshot           → last-stored data (no API call)
router.get('/watchlist-snapshot', mc.getWatchlistSnapshot);

// GET  /api/market/attention                    → rule-engine output (dashboard main endpoint)
router.get('/attention', mc.getAttention);

module.exports = router;
