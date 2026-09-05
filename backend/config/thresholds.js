/**
 * thresholds.js
 *
 * Single source of truth for all rule-engine thresholds.
 *
 * Change values here to tune sensitivity — no other file needs to change.
 * All values are in percentage points unless noted.
 */

module.exports = {

  // ── Absolute price change since user last checked ──────────────────────────
  // How much has the stock price moved (in %) from the user's last-seen price?
  priceChange: {
    yellowMin: 2.0,   // |change| ≥ 2%   → at least YELLOW
    redMin:    5.0,   // |change| ≥ 5%   → RED
  },

  // ── Relative performance vs benchmark index ────────────────────────────────
  // How much has the stock outperformed or underperformed NIFTY 50
  // since the user last checked? (stock Δ% − index Δ%, in percentage points)
  relativePerformance: {
    yellowMin: 1.5,   // |relative| ≥ 1.5 pp  → at least YELLOW
    redMin:    3.0,   // |relative| ≥ 3.0 pp  → RED
  },

  // ── Staleness threshold ────────────────────────────────────────────────────
  // How old (in hours) market data must be before we consider it stale.
  // Indian markets trade Mon–Fri, 9:15 AM – 3:30 PM IST.
  // 24 hours = safe window that covers overnight + weekends.
  staleDataHours: 24,

};
