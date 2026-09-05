import React, { useState } from 'react';
import FreshnessIndicator from './FreshnessIndicator';

const IMPACT_CONFIG = {
  HIGH: { emoji: '🔴', label: 'HIGH IMPACT', badgeClass: 'impact-badge--high', cardClass: 'rectangular-card--high' },
  MID:  { emoji: '🟡', label: 'MID IMPACT',  badgeClass: 'impact-badge--mid',  cardClass: 'rectangular-card--mid'  },
  LOW:  { emoji: '🟢', label: 'LOW IMPACT',  badgeClass: 'impact-badge--low',  cardClass: 'rectangular-card--low'  },
};

function fmt(n, decimals = 2) {
  if (n == null) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${parseFloat(n).toFixed(decimals)}%`;
}

function fmtPrice(n) {
  if (n == null) return '—';
  return '₹' + parseFloat(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function AttentionCard({
  stock,
  onAcknowledge,
  onMarkSeen,
  onGetAI,
  actionLoading,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [expanded, setIsExpanded] = useState(false);
  const [aiText, setAiText] = useState(null);
  const [aiNews, setAiNews] = useState([]);
  const [aiEvents, setAiEvents] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const impactLevel = stock.impactLevel || (stock.attentionLevel === 'RED' ? 'HIGH' : stock.attentionLevel === 'YELLOW' ? 'MID' : 'LOW');
  const impactScore = stock.impactScore || (impactLevel === 'HIGH' ? 82 : impactLevel === 'MID' ? 55 : 25);
  const cfg = IMPACT_CONFIG[impactLevel] || IMPACT_CONFIG.LOW;
  const summary = stock.summary || {};
  const bd = stock.impactBreakdown || summary.impactBreakdown || {
    priceAnomaly: 60,
    volumeAnomaly: 50,
    relativePerformance: 55,
    newsImpact: 50,
    corporateEvent: 40,
    catalystProximity: 45,
    dataConfidence: 100,
  };

  const showPopover = isHovered || expanded;

  async function handleGetAI() {
    if (!summary) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await onGetAI({
        ...summary,
        impactScore,
        impactLevel,
        impactBreakdown: bd,
      });
      setAiText(result.explanation);
      setAiNews(result.relatedNews || []);
      setAiEvents(result.corporateEvents || []);
    } catch (err) {
      setAiError(err.response?.data?.error || err.message || 'AI explanation unavailable');
    } finally {
      setAiLoading(false);
    }
  }

  function handleMarkSeen(e) {
    e.stopPropagation();
    onMarkSeen(stock.watchlistStockId);
    setIsExpanded(false);
    setAiText(null);
    setAiNews([]);
    setAiEvents([]);
  }

  return (
    <div
      className={`rectangular-impact-card ${cfg.cardClass}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsExpanded(false);
      }}
      onClick={() => setIsExpanded(!expanded)}
      style={{ position: 'relative' }}
    >
      {/* ── Main Rectangular Card Layout (Always Visible) ──────────────── */}
      <div className="impact-card-inner">
        <div className="impact-card-left">
          <span className={`impact-level-badge ${cfg.badgeClass}`}>
            {cfg.emoji} {cfg.label} ({impactScore})
          </span>
          <div className="stock-info-group">
            <span className="stock-symbol-title">{stock.symbol}</span>
            <span className="stock-company-subtitle">{stock.displayName}</span>
          </div>
        </div>

        <div className="impact-card-right">
          <div className="price-impact-box">
            <span className="stock-current-price">{fmtPrice(stock.price)}</span>
            <span className={`stock-2day-move ${stock.changePercent >= 0 ? 'move-up' : 'move-down'}`}>
              {fmt(stock.changePercent)} since 2 Sep
            </span>
          </div>
          <span className="hover-hint-icon" title="Hover or click for 7-factor score details">ℹ️</span>
        </div>
      </div>

      {/* ── Rich Inline Expanded Impact Details Drawer ──────────────────── */}
      {showPopover && (
        <div className="impact-inline-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="popover-header">
            <div className="popover-title-row">
              <h4>{stock.displayName} ({stock.symbol})</h4>
              <span className={`impact-level-badge ${cfg.badgeClass}`}>
                {cfg.emoji} {impactLevel} IMPACT SCORE: {impactScore}/100
              </span>
            </div>
            <p className="popover-reason-text">{stock.explanationReason || `${impactLevel} impact score calculated since your last visit on 2 Sep 2026.`}</p>
          </div>

          <div className={`popover-breakdown-section impact-breakdown--${impactLevel.toLowerCase()}`}>
            <h5 className="breakdown-heading">📊 7-Factor Market Impact Breakdown</h5>
            <div className="breakdown-grid">
              <div className="factor-row">
                <span className="factor-name">Price Anomaly (25%)</span>
                <div className="factor-bar-track">
                  <div className="factor-bar-fill" style={{ width: `${bd.priceAnomaly}%` }} />
                </div>
                <span className="factor-val">{bd.priceAnomaly}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Volume Anomaly (20%)</span>
                <div className="factor-bar-track">
                  <div className="factor-bar-fill" style={{ width: `${bd.volumeAnomaly}%` }} />
                </div>
                <span className="factor-val">{bd.volumeAnomaly}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Relative Perf vs NIFTY (15%)</span>
                <div className="factor-bar-track">
                  <div className="factor-bar-fill" style={{ width: `${bd.relativePerformance}%` }} />
                </div>
                <span className="factor-val">{bd.relativePerformance}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">News Impact (15%)</span>
                <div className="factor-bar-track">
                  <div className="factor-bar-fill" style={{ width: `${bd.newsImpact}%` }} />
                </div>
                <span className="factor-val">{bd.newsImpact}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Corporate Events (10%)</span>
                <div className="factor-bar-track">
                  <div className="factor-bar-fill" style={{ width: `${bd.corporateEvent}%` }} />
                </div>
                <span className="factor-val">{bd.corporateEvent}</span>
              </div>

              <div className="factor-row">
                <span className="factor-name">Catalyst Proximity (10%)</span>
                <div className="factor-bar-track">
                  <div className="factor-bar-fill" style={{ width: `${bd.catalystProximity}%` }} />
                </div>
                <span className="factor-val">{bd.catalystProximity}</span>
              </div>

              <div className="factor-row factor-row--confidence">
                <span className="factor-name factor-name--confidence">Data Confidence</span>
                <div className="factor-bar-track">
                  <div className="factor-bar-fill factor-bar-fill--conf" style={{ width: `${bd.dataConfidence}%` }} />
                </div>
                <span className="factor-val factor-val--confidence">{bd.dataConfidence}%</span>
              </div>
            </div>
          </div>

          {/* ── AI Explanation Section ─────────────────────────────────── */}
          <div className="popover-ai-box">
            {!aiText && !aiLoading && (
              <button className="btn btn--ai" onClick={handleGetAI} disabled={aiLoading}>
                ✨ Understand Why
              </button>
            )}

            {aiLoading && (
              <div className="ai-loading">
                <span className="spinner" /> Generating OpenAI narrative analysis...
              </div>
            )}

            {aiError && (
              <div className="ai-error">
                <span>⚠️ {aiError}</span>
                <button className="btn btn--ghost btn--sm" onClick={handleGetAI}>Retry</button>
              </div>
            )}

            {aiText && (
              <div className="ai-result">
                <div className="ai-result-header">
                  <span className="ai-result__label">✨ OpenAI Analysis & Impact Breakdown</span>
                  <button className="btn btn--ghost btn--sm" onClick={handleGetAI}>Refresh AI</button>
                </div>
                <p className="ai-result__text">{aiText}</p>

                {/* Measured Corporate Events & Filings */}
                {aiEvents && aiEvents.length > 0 && (
                  <div className="ai-section">
                    <h5 className="ai-section__title">🏢 Corporate Events & Disclosure Filings (Measured in Score)</h5>
                    <div className="ai-events-list">
                      {aiEvents.map((evt, idx) => (
                        <div key={idx} className="ai-event-card">
                          <div className="ai-event-card__header">
                            <span className="ai-event-badge">{evt.type}</span>
                            <span className="ai-event-date">{evt.date}</span>
                          </div>
                          <div className="ai-event-card__title">{evt.title}</div>
                          <div className="ai-event-card__impact">{evt.impact}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Measured Upstox News Articles */}
                {aiNews && aiNews.length > 0 && (
                  <div className="ai-section">
                    <h5 className="ai-section__title">📰 Market News Articles (Measured in 15% News Weight)</h5>
                    <div className="ai-news-list">
                      {aiNews.map((news, idx) => (
                        <div key={news.id || idx} className="ai-news-card">
                          <div className="ai-news-card__meta">
                            <span className="ai-news-source">{news.source || 'Market Feed'}</span>
                            {news.timestamp && (
                              <span className="ai-news-time">
                                {new Date(news.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <a
                            href={news.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="ai-news-card__title"
                            onClick={(e) => !news.url && e.preventDefault()}
                          >
                            {news.title} ↗
                          </a>
                          {news.snippet && <p className="ai-news-card__snippet">{news.snippet}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Popover Action Footer ─────────────────────────────────── */}
          <div className="popover-actions">
            <button
              className="btn btn--mark-seen"
              onClick={handleMarkSeen}
              disabled={actionLoading}
            >
              ✓ Mark as Seen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
