const express = require('express');
const router  = express.Router();
const aiController = require('../controllers/aiController');

// POST /api/ai/explain → returns narrative explanation
router.post('/explain', aiController.explainStockMovement);

module.exports = router;
