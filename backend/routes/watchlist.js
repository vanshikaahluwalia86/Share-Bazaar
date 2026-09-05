const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const lastSeenController  = require('../controllers/lastSeenController');

// ── Multi-Watchlist CRUD ─────────────────────────────────────────────────────
router.get('/all',             watchlistController.listWatchlists);
router.post('/create',         watchlistController.createWatchlist);
router.put('/:id',             watchlistController.updateWatchlist);
router.delete('/:id',          watchlistController.deleteWatchlist);

// ── 100-Stock Pulse Universe Lookup ──────────────────────────────────────────
router.get('/universe',        watchlistController.getPulseUniverse);

// ── Stock Management ─────────────────────────────────────────────────────────
router.get('/',                watchlistController.getWatchlist);
router.post('/stocks',         watchlistController.addStock);
router.delete('/stocks/:id',   watchlistController.removeStock);

// ── Last-seen baseline routes ────────────────────────────────────────────────
router.post('/stocks/:id/acknowledge', lastSeenController.acknowledgeStock);
router.post('/stocks/:id/mark-seen',   lastSeenController.markAsSeen);
router.get('/stocks/:id/last-seen',     lastSeenController.getLastSeen);

module.exports = router;
