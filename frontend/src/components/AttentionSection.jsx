import React from 'react';
import AttentionCard from './AttentionCard';

export default function AttentionSection({ stocks, onAcknowledge, onMarkSeen, onGetAI, actionLoading }) {
  const redStocks    = stocks.filter(s => s.attentionLevel === 'RED');
  const yellowStocks = stocks.filter(s => s.attentionLevel === 'YELLOW');
  const greenStocks  = stocks.filter(s => s.attentionLevel === 'GREEN');
  const noDataStocks = stocks.filter(s => !s.hasData);

  const needsAttention = [...redStocks, ...yellowStocks];

  if (stocks.length === 0) {
    return (
      <div className="attention-section">
        <h2 className="section-title">What's Changed</h2>
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <p className="empty-state__title">Your watchlist is empty</p>
          <p className="empty-state__sub">Add stocks below to start tracking meaningful changes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="attention-section">
      <h2 className="section-title">
        What's Changed
        <span className="section-meta">On Your Radar • {stocks.length} stock{stocks.length !== 1 ? 's' : ''} tracked</span>
      </h2>

      {/* ── Attention summary pills ────────────────────────────────────── */}
      <div className="attention-summary">
        {redStocks.length > 0 && (
          <span className="summary-pill summary-pill--red">
            🔴 {redStocks.length} need{redStocks.length === 1 ? 's' : ''} attention
          </span>
        )}
        {yellowStocks.length > 0 && (
          <span className="summary-pill summary-pill--yellow">
            🟡 {yellowStocks.length} noteworthy
          </span>
        )}
        {greenStocks.length > 0 && (
          <span className="summary-pill summary-pill--green">
            🟢 {greenStocks.length} no change
          </span>
        )}
      </div>

      {/* ── Stocks that need attention (RED + YELLOW) ─────────────────── */}
      {needsAttention.length > 0 && (
        <div className="attention-cards">
          {needsAttention.map(stock => (
            <AttentionCard
              key={stock.watchlistStockId || stock.symbol}
              stock={stock}
              onAcknowledge={onAcknowledge}
              onMarkSeen={onMarkSeen}
              onGetAI={onGetAI}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* ── All-green state ────────────────────────────────────────────── */}
      {needsAttention.length === 0 && greenStocks.length > 0 && (
        <div className="all-green-state">
          <span className="all-green-state__icon">🟢</span>
          <p className="all-green-state__title">All clear — nothing significant since you last checked.</p>
          <p className="all-green-state__sub">
            {greenStocks.map(s => s.symbol).join(' · ')}
          </p>
        </div>
      )}

      {/* ── No market data yet ─────────────────────────────────────────── */}
      {noDataStocks.length > 0 && (
        <div className="info-banner">
          ℹ {noDataStocks.map(s => s.symbol).join(', ')} {noDataStocks.length === 1 ? 'has' : 'have'} no market data yet.
          Click <strong>Refresh Market Data</strong> to fetch prices.
        </div>
      )}

      {/* ── Green stocks (collapsed, below fold) ──────────────────────── */}
      {greenStocks.length > 0 && needsAttention.length > 0 && (
        <details className="green-stocks-detail">
          <summary className="green-stocks-summary">
            🟢 {greenStocks.length} stock{greenStocks.length !== 1 ? 's' : ''} with no significant change
          </summary>
          <div className="attention-cards" style={{ marginTop: 8 }}>
            {greenStocks.map(stock => (
              <AttentionCard
                key={stock.watchlistStockId || stock.symbol}
                stock={stock}
                onAcknowledge={onAcknowledge}
                onMarkSeen={onMarkSeen}
                onGetAI={onGetAI}
                actionLoading={actionLoading}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
