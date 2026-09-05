import React, { useState } from 'react';

export default function NewsFeed({ newsData = {}, stocks = [] }) {
  const [selectedSymbol, setSelectedSymbol] = useState('ALL');
  const [visibleCount, setVisibleCount] = useState(10); // Show at least 10 initially

  const rawWatchlistNews = newsData.watchlistNews || [];
  const rawGeneralNews   = newsData.generalNews || [];

  // Extract unique stock symbols from active watchlist stocks & news stream
  const stockSymbols = Array.from(
    new Set([
      ...stocks.map(s => s.symbol.toUpperCase()),
      ...rawWatchlistNews.map(n => (n.symbol || '').toUpperCase()).filter(Boolean),
    ])
  );

  // Filter watchlist news by selected stock symbol
  const filteredWatchlistNews = selectedSymbol === 'ALL'
    ? rawWatchlistNews
    : rawWatchlistNews.filter(n => (n.symbol || '').toUpperCase() === selectedSymbol.toUpperCase());

  // 1st story for top feature banner
  const featuredStory = filteredWatchlistNews[0];

  // Remaining stories for left column list (starting from index 1)
  const remainingWatchlistStories = filteredWatchlistNews.slice(1);
  const visibleWatchlistStories = remainingWatchlistStories.slice(0, visibleCount);

  const hasMore = visibleCount < remainingWatchlistStories.length;

  function handleShowMore() {
    setVisibleCount(prev => prev + 10);
  }

  return (
    <div className="upstox-news-page">
      {/* ── 1. Header & Watchlist Stock Filter Pill Bar ──────────────────── */}
      <div className="upstox-news-header">
        <h1 className="upstox-news-title">Market News</h1>
        <p className="upstox-news-subtitle">
          Real-time news coverage for stocks in your watchlist & broad market stream.
        </p>

        {/* Horizontal Stock Filter Pill Bar */}
        <div className="category-pill-bar">
          <button
            className={`category-pill ${selectedSymbol === 'ALL' ? 'category-pill--active' : ''}`}
            onClick={() => {
              setSelectedSymbol('ALL');
              setVisibleCount(10);
            }}
          >
            All Watchlist Stocks ({rawWatchlistNews.length})
          </button>
          {stockSymbols.map(sym => {
            const count = rawWatchlistNews.filter(n => (n.symbol || '').toUpperCase() === sym).length;
            return (
              <button
                key={sym}
                className={`category-pill ${selectedSymbol === sym ? 'category-pill--active' : ''}`}
                onClick={() => {
                  setSelectedSymbol(sym);
                  setVisibleCount(10);
                }}
              >
                {sym} {count > 0 ? `(${count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Upstox 2-Column Asymmetric News Grid ────────────────────── */}
      <div className="upstox-news-grid">
        {/* ── LEFT COLUMN (Larger): Watchlist Stock News (Top Story + 10+ items) ── */}
        <div className="news-main-column">
          <div className="column-header-row">
            <h2 className="column-title">
              📰 WATCHLIST STOCK NEWS {selectedSymbol !== 'ALL' ? `— ${selectedSymbol}` : ''}
            </h2>
            <span className="column-subtitle">
              {filteredWatchlistNews.length} articles found for {selectedSymbol === 'ALL' ? 'all watchlist stocks' : selectedSymbol}
            </span>
          </div>

          {filteredWatchlistNews.length === 0 ? (
            <div className="empty-news-box">
              <p>No active news articles found for <strong>{selectedSymbol}</strong> right now.</p>
            </div>
          ) : (
            <>
              {/* Top Featured Story Banner */}
              {featuredStory && (
                <div className="top-featured-card">
                  {featuredStory.thumbnail ? (
                    <img
                      src={featuredStory.thumbnail}
                      alt={featuredStory.title}
                      className="featured-image"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="featured-image-placeholder">
                      <span>📰 FEATURED STORY — {featuredStory.symbol}</span>
                    </div>
                  )}
                  <div className="featured-content">
                    <div className="featured-meta">
                      <span className="featured-tag">{featuredStory.symbol || 'WATCHLIST'}</span>
                      <span className="featured-category">{featuredStory.category || 'TOP STORY'}</span>
                      <span className="featured-time">
                        {featuredStory.timestamp
                          ? new Date(featuredStory.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST'
                          : 'Live'}
                      </span>
                    </div>
                    <h3 className="featured-title">{featuredStory.title}</h3>
                    <p className="featured-snippet">{featuredStory.snippet}</p>
                    <div className="featured-footer">
                      <span className="featured-source">Source: {featuredStory.source || 'Market Feed'}</span>
                      {featuredStory.url && (
                        <a
                          href={featuredStory.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-read-featured"
                        >
                          Read Full Article ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* List of Watchlist Stock News (at least 10 items) */}
              <div className="watchlist-news-vertical-list">
                {visibleWatchlistStories.map(item => (
                  <div key={item.id} className="news-list-card">
                    {item.thumbnail && (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="list-card-thumb"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="list-card-content">
                      <div className="list-card-meta">
                        <span className="stock-pill">{item.symbol}</span>
                        <span className="list-card-time">
                          {item.timestamp
                            ? new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST'
                            : 'Live'}
                        </span>
                      </div>
                      <h4 className="list-card-title">{item.title}</h4>
                      {item.snippet && <p className="list-card-snippet">{item.snippet}</p>}
                      <div className="list-card-footer">
                        <span className="list-card-source">{item.source || 'Market Feed'}</span>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="list-card-link">
                            Read Story ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* "Show More News" Button */}
              {hasMore && (
                <div className="show-more-wrapper">
                  <button className="btn-show-more-news" onClick={handleShowMore}>
                    Show More News ➔ ({remainingWatchlistStories.length - visibleCount} more articles)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT COLUMN (Smaller Sidebar): Overall Market News ──────────────── */}
        <div className="news-sidebar-column">
          <div className="column-header-row">
            <h2 className="column-title">🌐 OVERALL MARKET NEWS</h2>
            <span className="column-subtitle">NIFTY 50, Economy & Global Stream</span>
          </div>

          {rawGeneralNews.length === 0 ? (
            <div className="empty-sidebar-box">
              <p>Loading broad market news stream...</p>
            </div>
          ) : (
            <div className="sidebar-news-list">
              {rawGeneralNews.map(item => (
                <div key={item.id} className="sidebar-news-card">
                  {item.thumbnail && (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="sidebar-card-thumb"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="sidebar-card-body">
                    <div className="sidebar-card-meta">
                      <span className="sidebar-cat-pill">{item.category || 'MARKET'}</span>
                      <span className="sidebar-time">
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                          : 'Live'}
                      </span>
                    </div>
                    <a
                      href={item.url || 'https://upstox.com/news'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-card-title"
                    >
                      {item.title} ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
