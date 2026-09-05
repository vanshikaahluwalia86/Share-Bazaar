import React from 'react';

/** Shows how fresh/stale the market data is. */
export default function FreshnessIndicator({ marketDataTs, fetchedAt, isStale }) {
  if (!marketDataTs) {
    return <span className="freshness freshness--unknown">No data yet</span>;
  }

  const dataDate = new Date(marketDataTs);
  const now      = new Date();
  const diffMs   = now - dataDate;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs  = Math.floor(diffMins / 60);

  let label;
  if (diffMins < 2)       label = 'Just updated';
  else if (diffMins < 60) label = `${diffMins}m old`;
  else if (diffHrs < 24)  label = `${diffHrs}h old`;
  else                    label = `${Math.floor(diffHrs/24)}d old`;

  return (
    <span className={`freshness ${isStale ? 'freshness--stale' : 'freshness--live'}`}>
      {isStale ? '⏱ ' : '● '}
      {isStale ? `Delayed · ${label}` : `Live · ${label}`}
    </span>
  );
}
