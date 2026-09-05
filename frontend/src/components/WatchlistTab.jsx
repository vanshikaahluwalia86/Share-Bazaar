import React from 'react';
import TickerCarousel from './TickerCarousel';
import AttentionCard from './AttentionCard';
import DetailedTableView from './DetailedTableView';
import WatchlistTabs from './WatchlistTabs';
import AddStockForm from './AddStockForm';

export default function WatchlistTab({
  indexes,
  stocks = [],
  watchlists = [],
  activeWlId,
  onSelectWatchlist,
  onCreateWatchlist,
  onRenameWatchlist,
  onSetDefaultWatchlist,
  onDeleteWatchlist,
  onAcknowledge,
  onMarkSeen,
  onGetAI,
  onOpenAddModal,
  onOpenColModal,
  visibleColumns = [],
  onRemoveStock,
  onAddStock,
  onSelectStockForChart,
  existingSymbols = [],
  actionLoading,
  error,
  fetchAttentionData,
}) {
  return (
    <div className="watchlist-tab-wrapper">
      {error && (
        <div className="banner banner--error" style={{ marginBottom: 16 }}>
          <span>⚠️ {error}</span>
          <button className="btn btn--sm btn--ghost" onClick={() => fetchAttentionData(activeWlId)}>
            Retry
          </button>
        </div>
      )}

      {/* ── 1. TOP SECTION: Moving Live Ticker Carousel Strip (NIFTY 50, SENSEX & Top Stocks) ─ */}
      <section className="home-section home-section--top">
        <TickerCarousel indexes={indexes} stocks={stocks} />
      </section>

      {/* ── 2. MIDDLE SECTION: What Changed Section ─────────────────────────────────── */}
      <section className="home-section">
        <div className="section-header-bar">
          <div>
            <h2 className="home-section-title">⚡ What's Changed</h2>
            <span className="section-meta-text">
              On Your Radar • 7-Factor Market Impact Scores calculated since your last login on 2 Sep 2026 (Today: 4 Sep 2026)
            </span>
          </div>
          <span className="section-badge">On Your Radar</span>
        </div>

        {stocks.length === 0 ? (
          <div className="all-clear-banner">
            <span className="all-clear-icon">🟢</span>
            <div>
              <h4 className="all-clear-title">Your Watchlist is Empty</h4>
              <p className="all-clear-desc">
                Click <strong>"➕ Add Stock"</strong> below to start tracking stocks and their 7-Factor Impact Scores.
              </p>
            </div>
          </div>
        ) : (
          <div className="attention-cards-wrapper">
            {stocks.map(stock => (
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
      </section>

      {/* ── 3. BOTTOM SECTION: Watchlist Tabs & Screener Detailed Table ───────────── */}
      <section className="home-section" style={{ marginTop: 32 }}>
        {/* Multi-Watchlist Tabs */}
        {watchlists.length > 0 && (
          <WatchlistTabs
            watchlists={watchlists}
            activeId={activeWlId}
            onSelect={onSelectWatchlist}
            onCreate={onCreateWatchlist}
            onRename={onRenameWatchlist}
            onSetDefault={onSetDefaultWatchlist}
            onDelete={onDeleteWatchlist}
          />
        )}

        {/* Screener-style Detailed Table */}
        <DetailedTableView
          stocks={stocks}
          visibleColumns={visibleColumns}
          onOpenAddModal={onOpenAddModal}
          onOpenColModal={onOpenColModal}
          onMarkSeen={onMarkSeen}
          onGetAI={onGetAI}
          onRemoveStock={onRemoveStock}
          onSelectStockForChart={onSelectStockForChart}
          actionLoading={actionLoading}
        />
      </section>
    </div>
  );
}
