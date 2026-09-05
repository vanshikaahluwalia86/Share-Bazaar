import React from 'react';

export default function HomeOverview({ onNavigateWatchlist, marketIndex, stockCount }) {
  return (
    <div className="home-overview">
      {/* Hero Welcome Card */}
      <div className="home-hero">
        <div className="hero-content">
          <span className="hero-badge">🚀 SHAREBAZAAR INTELLIGENCE</span>
          <h1 className="hero-title">Market Pulse</h1>
          <p className="hero-subtitle">
            Don’t scan your watchlist manually. Our deterministic rule engine tracks persistent observation baselines and highlights only what deserves your attention.
          </p>
          <div className="hero-actions">
            <button className="btn btn--primary" onClick={onNavigateWatchlist}>
              📊 Launch My Watchlist
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🎯</div>
          <h3>Last-Seen Baseline Engine</h3>
          <p>Prices and index moves are benchmarked from the exact moment you last intentionally viewed a stock. Page reloads never reset your baselines.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">⚡</div>
          <h3>Live Market Quotes</h3>
          <p>Stream real-time Indian stock market prices, ₹ change, % change, day high, day low, and previous close directly from live market APIs.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🌐</div>
          <h3>100-Stock Pulse Universe</h3>
          <p>Pre-loaded catalog containing all 50 NIFTY 50 and 50 NIFTY NEXT 50 benchmark stocks for instant search and multi-watchlist addition.</p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3>Factual AI Narrative</h3>
          <p>Generates plain-English narrative summaries explaining stock movements without speculative advice or invented news.</p>
        </div>
      </div>
    </div>
  );
}
