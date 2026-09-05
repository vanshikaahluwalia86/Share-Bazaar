import React from 'react';
import IndexHeaderCards from './IndexHeaderCards';
import AttentionCard from './AttentionCard';

export default function HomeTab({
  indexes,
  stocks = [],
  newsData = {},
  onAcknowledge,
  onMarkSeen,
  onGetAI,
  actionLoading,
  onNavigateNews,
}) {
  // Filter watchlist news strictly for stocks present in user's active watchlist
  const watchlistSymbols = new Set(stocks.map(s => s.symbol.toUpperCase()));
  const allWatchlistNews = newsData.watchlistNews || [];
  
  const filteredNews = allWatchlistNews.filter(item =>
    watchlistSymbols.size === 0 || watchlistSymbols.has(item.symbol.toUpperCase())
  );

  // Show only 3 news items at a time
  const top3News = filteredNews.slice(0, 3);

  return (
    <div className="home-tab-wrapper">
      {/* ── 1. Top Index Rectangular Containers (NIFTY 50 + SENSEX) ──────────── */}
      <section className="home-section">
        <IndexHeaderCards indexes={indexes} />
      </section>

      {/* ── 2. Watchlist Stock News Feed Section (Top 3 Watchlist-Only) ───────── */}
      <section className="home-section">
        <div className="section-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="home-section-title">📰 Watchlist Stock News</h2>
            <span className="section-meta-text">
              Showing top 3 updates for stocks in your active watchlist
            </span>
          </div>
          {onNavigateNews && (
            <button
              onClick={onNavigateNews}
              className="btn btn--outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
              }}
            >
              View Market News Page ➔
            </button>
          )}
        </div>

        {top3News.length === 0 ? (
          <div className="empty-news-box">
            <p>No active news for your watchlist stocks right now.</p>
          </div>
        ) : (
          <div className="watchlist-news-grid">
            {top3News.map(item => (
              <div key={item.id} className="watchlist-news-card">
                {item.thumbnail && (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="news-card-thumbnail"
                    style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px 6px 0 0', marginBottom: '8px' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div className="news-card-header">
                  <span className="stock-tag">{item.symbol}</span>
                  <span className="news-timestamp">
                    {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
                  </span>
                </div>
                <h4 className="news-card-heading">{item.title}</h4>
                <p className="news-card-text">{item.snippet}</p>
                <div className="news-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Source: {item.source}</span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="news-read-more-link" style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                      Read Story ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 3. What Changed Since Your Last Visit? ───────────────────────────────── */}
      <section className="home-section">
        <div className="section-header-bar">
          <div>
            <h2 className="home-section-title">⚡ What's Changed</h2>
            <span className="section-meta-text">
              On Your Radar • Calculated Market Impact Scores since your last login on 2 Sep 2026 (Today: 4 Sep 2026)
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
                Add stocks from the universe catalog to track Market Impact Scores since 2 Sep 2026.
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

      {/* ── 4. Broad Market, Index & Global News (Horizontal Rectangular Containers) ─ */}
      <section className="home-section" style={{ marginTop: 32 }}>
        <div className="section-header-bar">
          <div>
            <h2 className="home-section-title">🌐 Broad Market, Index & Global News</h2>
            <span className="section-meta-text">Real-time market feed for NIFTY 50, SENSEX & global economic factors</span>
          </div>
          <span className="section-badge section-badge--secondary">Live Stream</span>
        </div>

        {(newsData.generalNews || []).length === 0 ? (
          <div className="empty-news-box">
            <p>Loading real-time market updates...</p>
          </div>
        ) : (
          <div className="market-news-strip-list">
            {(newsData.generalNews || []).map(item => (
              <div key={item.id} className="market-news-strip-card">
                <div className="strip-content-left">
                  <span className="strip-category-tag">{item.category || 'MARKET'}</span>
                  <span className="strip-title-text" title={item.title}>{item.title}</span>
                  <span className="strip-timestamp">
                    {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST
                  </span>
                </div>
                <a
                  href={item.url || 'https://upstox.com/news'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-strip-read-more"
                >
                  Read More ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
