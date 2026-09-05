import React from 'react';
import FreshnessIndicator from './FreshnessIndicator';

export default function MarketSummary({ index }) {
  const changeSign  = index?.changePercent >= 0 ? '+' : '';
  const changeColor = index?.changePercent >= 0 ? 'var(--green)' : 'var(--red)';

  return (
    <div className="market-summary">
      {/* Left: Index info */}
      <div className="market-summary__index">
        <span className="market-summary__label">NIFTY 50</span>
        {index ? (
          <>
            <span className="market-summary__price">
              ₹{parseFloat(index.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="market-summary__change" style={{ color: changeColor }}>
              {changeSign}{parseFloat(index.changePercent).toFixed(2)}%
            </span>
            <FreshnessIndicator marketDataTs={index.marketDataTs} isStale={index.isStale} />
          </>
        ) : (
          <span className="text-muted">Loading live index quote…</span>
        )}
      </div>

      {/* Right: Live Status Indicator */}
      <div className="market-summary__actions">
        <span className="live-badge-pulse">
          <span className="pulse-dot"></span> Live Stream Active
        </span>
      </div>
    </div>
  );
}
