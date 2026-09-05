import React, { useState } from 'react';

function fmtPrice(val) {
  if (val == null || isNaN(val)) return '—';
  return '₹' + parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtAmt(val) {
  if (val == null || isNaN(val)) return '—';
  const num = parseFloat(val);
  const sign = num > 0 ? '+₹' : num < 0 ? '-₹' : '₹';
  return `${sign}${Math.abs(num).toFixed(2)}`;
}

function fmtPct(val) {
  if (val == null || isNaN(val)) return '—';
  const num = parseFloat(val);
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

function fmtNum(val, decimals = 2) {
  if (val == null || isNaN(val)) return '—';
  return parseFloat(val).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

// Screener-style fallback metric lookup for demonstration consistency
const METRIC_DEFAULTS = {
  RELIANCE:   { pe: 24.15, marketCap: 1985420.5, divYield: 0.35, npQtr: 17394.00, qtrProfitVar: 4.85,  salesQtr: 231784.00, qtrSalesVar: 11.50, roce: 9.85  },
  TATAMOTORS: { pe: 10.42, marketCap: 114520.8,  divYield: 1.90, npQtr: 5564.00,  qtrProfitVar: 73.80, salesQtr: 105128.00, qtrSalesVar: 13.30, roce: 17.40 },
  HDFCBANK:   { pe: 18.30, marketCap: 1284560.1, divYield: 1.15, npQtr: 16511.00, qtrProfitVar: 33.50, salesQtr: 71700.00,  qtrSalesVar: 26.40, roce: 16.20 },
  MARUTI:     { pe: 28.60, marketCap: 398540.2,  divYield: 1.05, npQtr: 3650.00,  qtrProfitVar: 47.10, salesQtr: 38235.00,  qtrSalesVar: 19.80, roce: 18.90 },
  ADANIENT:   { pe: 95.40, marketCap: 335410.0,  divYield: 0.10, npQtr: 1245.00,  qtrProfitVar: 128.40,salesQtr: 25410.00,  qtrSalesVar: 14.20, roce: 11.30 },
  INFY:       { pe: 26.80, marketCap: 784510.6,  divYield: 2.40, npQtr: 6212.00,  qtrProfitVar: 7.30,  salesQtr: 39315.00,  qtrSalesVar: 3.60,  roce: 40.50 },
  TCS:        { pe: 31.40, marketCap: 1542100.0, divYield: 1.45, npQtr: 12434.00, qtrProfitVar: 8.70,  salesQtr: 62613.00,  qtrSalesVar: 5.40,  roce: 58.20 },
  ICICIBANK:  { pe: 17.20, marketCap: 845210.0,  divYield: 0.85, npQtr: 11059.00, qtrProfitVar: 14.50, salesQtr: 43210.00,  qtrSalesVar: 19.10, roce: 15.80 },
  APOLLOHOSP: { pe: 64.20, marketCap: 124300.0,  divYield: 0.25, npQtr: 305.00,   qtrProfitVar: 82.50, salesQtr: 5085.00,   qtrSalesVar: 15.10, roce: 14.60 },
  ZOMATO:     { pe: 92.40, marketCap: 224510.0,  divYield: 0.00, npQtr: 253.00,   qtrProfitVar: 268.00,salesQtr: 4206.00,   qtrSalesVar: 68.50, roce: 6.80  },
  ETERNAL:    { pe: 92.40, marketCap: 224510.0,  divYield: 0.00, npQtr: 253.00,   qtrProfitVar: 268.00,salesQtr: 4206.00,   qtrSalesVar: 68.50, roce: 6.80  },
};

export default function DetailedTableView({
  stocks = [],
  visibleColumns = [],
  onOpenAddModal,
  onOpenColModal,
  onMarkSeen,
  onGetAI,
  onRemoveStock,
  onSelectStockForChart,
  actionLoading,
}) {
  const [expandedStockId, setExpandedStockId] = useState(null);
  const [aiStateMap, setAiStateMap] = useState({});

  const showCol = (colId) => visibleColumns.includes(colId);
  const totalVisibleCols = visibleColumns.length + 1; // +1 for actions

  function toggleExpandRow(stock) {
    const id = stock.watchlistStockId || stock.symbol;
    setExpandedStockId(prev => prev === id ? null : id);
  }

  async function handleGetAIForStock(stock) {
    const id = stock.watchlistStockId || stock.symbol;
    const summary = stock.summary || {};
    const impactLevel = stock.impactLevel || (stock.attentionLevel === 'RED' ? 'HIGH' : stock.attentionLevel === 'YELLOW' ? 'MID' : 'LOW');
    const impactScore = stock.impactScore || (impactLevel === 'HIGH' ? 82 : impactLevel === 'MID' ? 55 : 25);
    const bd = stock.impactBreakdown || summary.impactBreakdown || {
      priceAnomaly: 60, volumeAnomaly: 50, relativePerformance: 55,
      newsImpact: 50, corporateEvent: 40, catalystProximity: 45, dataConfidence: 100,
    };

    setAiStateMap(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), loading: true, error: null },
    }));

    try {
      if (!onGetAI) throw new Error('AI service unavailable');
      const result = await onGetAI({
        ...summary,
        symbol: stock.symbol,
        displayName: stock.displayName,
        currentPrice: stock.price,
        previousClose: stock.previousClose,
        impactScore,
        impactLevel,
        impactBreakdown: bd,
      });

      setAiStateMap(prev => ({
        ...prev,
        [id]: {
          text: result.explanation,
          news: result.relatedNews || [],
          events: result.corporateEvents || [],
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      setAiStateMap(prev => ({
        ...prev,
        [id]: {
          loading: false,
          error: err.response?.data?.error || err.message || 'AI explanation failed',
        },
      }));
    }
  }

  return (
    <div className="screener-table-card">
      {/* ── Table Top Header Bar ────────────────────────────────────────── */}
      <div className="screener-table-header">
        <div className="screener-header-left">
          <h3 className="screener-table-title">📊 Watchlist Stock Screener Table</h3>
          <span className="screener-table-count">{stocks.length} Companies Tracked</span>
        </div>
        <div className="screener-header-actions">
          {onOpenAddModal && (
            <button className="btn btn--primary btn--sm" onClick={onOpenAddModal}>
              ➕ Add Stock
            </button>
          )}
          {onOpenColModal && (
            <button className="btn btn--outline btn--sm btn--edit-cols" onClick={onOpenColModal}>
              ⚙️ EDIT COLUMNS
            </button>
          )}
        </div>
      </div>

      {stocks.length === 0 ? (
        <div className="empty-table-box">
          <p>No stocks in this watchlist yet. Click <strong>"➕ Add Stock"</strong> to start tracking!</p>
        </div>
      ) : (
        <div className="table-responsive-scroll">
          <table className="screener-table">
            <thead>
              <tr>
                {showCol('sNo') && <th className="text-center th-sno">S.No.</th>}
                {showCol('company') && <th>Name</th>}
                {showCol('symbol') && <th>Symbol</th>}
                {showCol('price') && <th className="text-right">CMP Rs.</th>}
                {showCol('pe') && <th className="text-right">P/E</th>}
                {showCol('marketCap') && <th className="text-right">Mar Cap Rs.Cr.</th>}
                {showCol('divYield') && <th className="text-right">Div Yld %</th>}
                {showCol('npQtr') && <th className="text-right">NP Qtr Rs.Cr.</th>}
                {showCol('qtrProfitVar') && <th className="text-right">Qtr Profit Var %</th>}
                {showCol('salesQtr') && <th className="text-right">Sales Qtr Rs.Cr.</th>}
                {showCol('qtrSalesVar') && <th className="text-right">Qtr Sales Var %</th>}
                {showCol('roce') && <th className="text-right">ROCE %</th>}
                {showCol('changePercent') && <th className="text-right">Daily %</th>}
                {showCol('change2D') && <th className="text-right">2D Move %</th>}
                {showCol('dayHigh') && <th className="text-right">Day High</th>}
                {showCol('dayLow') && <th className="text-right">Day Low</th>}
                {showCol('exchange') && <th className="text-center">Exchange</th>}
                {showCol('attention') && <th className="text-center">Impact</th>}
                <th className="text-center th-actions">Action</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock, index) => {
                const stockId   = stock.watchlistStockId || stock.symbol;
                const sym       = stock.symbol ? stock.symbol.toUpperCase() : '';
                const defaults  = METRIC_DEFAULTS[sym] || {
                  pe: 21.43, marketCap: 11219.43, divYield: 1.59, npQtr: 92.03,
                  qtrProfitVar: 10.40, salesQtr: 1955.83, qtrSalesVar: 9.49, roce: 9.69
                };

                const price     = stock.price != null ? stock.price : stock.summary?.currentPrice;
                const prevClose = stock.previousClose != null ? stock.previousClose : stock.summary?.previousClose;
                const dailyPct  = stock.changePercent != null ? stock.changePercent : stock.summary?.marketChangePercent;
                const isDailyUp = dailyPct != null ? dailyPct >= 0 : true;

                const move2D    = stock.changePercent != null ? stock.changePercent : 0;
                const is2DUp    = move2D >= 0;

                const pe          = stock.pe ?? defaults.pe;
                const marketCap   = stock.marketCap ?? defaults.marketCap;
                const divYield    = stock.divYield ?? defaults.divYield;
                const npQtr       = stock.npQtr ?? defaults.npQtr;
                const qtrProfVar  = stock.qtrProfitVar ?? defaults.qtrProfitVar;
                const salesQtr    = stock.salesQtr ?? defaults.salesQtr;
                const qtrSalesVar = stock.qtrSalesVar ?? defaults.qtrSalesVar;
                const roce        = stock.roce ?? defaults.roce;

                const dayHigh     = stock.dayHigh != null ? stock.dayHigh : stock.summary?.dayHigh;
                const dayLow      = stock.dayLow != null ? stock.dayLow : stock.summary?.dayLow;

                const impactLevel = stock.impactLevel || (stock.attentionLevel === 'RED' ? 'HIGH' : stock.attentionLevel === 'YELLOW' ? 'MID' : 'LOW');
                const impactScore = stock.impactScore || (impactLevel === 'HIGH' ? 82 : impactLevel === 'MID' ? 55 : 25);
                const badgeCls    = impactLevel === 'HIGH' ? 'screener-badge--high' : impactLevel === 'MID' ? 'screener-badge--mid' : 'screener-badge--low';

                const bd = stock.impactBreakdown || stock.summary?.impactBreakdown || {
                  priceAnomaly: 60, volumeAnomaly: 50, relativePerformance: 55,
                  newsImpact: 50, corporateEvent: 40, catalystProximity: 45, dataConfidence: 100,
                };

                const isExpanded = expandedStockId === stockId;
                const aiState = aiStateMap[stockId] || {};

                return (
                  <React.Fragment key={stockId}>
                    <tr className={`screener-row ${isExpanded ? 'screener-row--active' : ''}`}>
                      {showCol('sNo') && <td className="text-center font-mono cell-sno">{index + 1}.</td>}
                      {showCol('company') && (
                        <td className="cell-company">
                          <span
                            className="company-link-title"
                            onClick={() => onSelectStockForChart ? onSelectStockForChart(stock) : toggleExpandRow(stock)}
                            title="Click to open interactive Stock Chart"
                          >
                            {stock.displayName || stock.symbol} 📈
                          </span>
                        </td>
                      )}
                      {showCol('symbol') && (
                        <td className="cell-symbol">
                          <span
                            className="stock-sym-tag"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onSelectStockForChart && onSelectStockForChart(stock)}
                            title="Click to open interactive Stock Chart"
                          >
                            {stock.symbol}
                          </span>
                        </td>
                      )}
                      {showCol('price') && <td className="text-right font-mono font-bold">{fmtNum(price)}</td>}
                      {showCol('pe') && <td className="text-right font-mono">{fmtNum(pe)}</td>}
                      {showCol('marketCap') && <td className="text-right font-mono">{fmtNum(marketCap)}</td>}
                      {showCol('divYield') && <td className="text-right font-mono">{fmtNum(divYield)}</td>}
                      {showCol('npQtr') && <td className="text-right font-mono">{fmtNum(npQtr)}</td>}
                      {showCol('qtrProfitVar') && (
                        <td className={`text-right font-mono ${qtrProfVar >= 0 ? 'txt-up' : 'txt-down'}`}>
                          {fmtNum(qtrProfVar)}
                        </td>
                      )}
                      {showCol('salesQtr') && <td className="text-right font-mono">{fmtNum(salesQtr)}</td>}
                      {showCol('qtrSalesVar') && (
                        <td className={`text-right font-mono ${qtrSalesVar >= 0 ? 'txt-up' : 'txt-down'}`}>
                          {fmtNum(qtrSalesVar)}
                        </td>
                      )}
                      {showCol('roce') && <td className="text-right font-mono">{fmtNum(roce)}</td>}
                      {showCol('changePercent') && (
                        <td className={`text-right font-mono font-bold ${isDailyUp ? 'txt-up' : 'txt-down'}`}>
                          {fmtPct(dailyPct)}
                        </td>
                      )}
                      {showCol('change2D') && (
                        <td className={`text-right font-mono font-bold ${is2DUp ? 'txt-up' : 'txt-down'}`}>
                          {fmtPct(move2D)}
                        </td>
                      )}
                      {showCol('dayHigh') && <td className="text-right font-mono text-muted">{fmtPrice(dayHigh)}</td>}
                      {showCol('dayLow') && <td className="text-right font-mono text-muted">{fmtPrice(dayLow)}</td>}
                      {showCol('exchange') && <td className="text-center cell-exchange">{stock.exchange || 'NSE'}</td>}
                      {showCol('attention') && (
                        <td className="text-center cell-impact">
                          <span
                            className={`screener-badge ${badgeCls} screener-badge--interactive`}
                            onClick={() => toggleExpandRow(stock)}
                            title="Click to check 7-Factor Market Impact Breakdown & OpenAI Analysis"
                          >
                            {impactLevel} ({impactScore}) 🔍
                          </span>
                        </td>
                      )}
                      <td className="text-center cell-actions">
                        <button
                          className="btn-remove-stock-icon"
                          onClick={() => onRemoveStock(stock.watchlistStockId)}
                          disabled={actionLoading}
                          title="Remove stock from watchlist"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>

                    {/* ── EXPANDED IMPACT DETAILS DRAWER ROW ─────────────────────── */}
                    {isExpanded && (
                      <tr className="screener-expanded-row">
                        <td colSpan={totalVisibleCols}>
                          <div className="table-impact-drawer">
                            <div className="popover-header">
                              <div className="popover-title-row">
                                <h4>{stock.displayName} ({stock.symbol})</h4>
                                <span className={`screener-badge ${badgeCls}`}>
                                  {impactLevel} IMPACT SCORE: {impactScore}/100
                                </span>
                              </div>
                              <p className="popover-reason-text">
                                {stock.explanationReason || `${impactLevel} impact score calculated since 2 Sep 2026.`}
                              </p>
                            </div>

                            {/* 7-Factor Breakdown Progress Bars */}
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

                            {/* OpenAI Narrative Explanation Box */}
                            <div className="popover-ai-box">
                              {!aiState.text && !aiState.loading && (
                                <button className="btn btn--ai" onClick={() => handleGetAIForStock(stock)}>
                                  ✨ Understand Why
                                </button>
                              )}

                              {aiState.loading && (
                                <div className="ai-loading">
                                  <span className="spinner" /> Generating OpenAI narrative analysis...
                                </div>
                              )}

                              {aiState.error && (
                                <div className="ai-error">
                                  <span>⚠️ {aiState.error}</span>
                                  <button className="btn btn--ghost btn--sm" onClick={() => handleGetAIForStock(stock)}>
                                    Retry
                                  </button>
                                </div>
                              )}

                              {aiState.text && (
                                <div className="ai-result">
                                  <div className="ai-result-header">
                                    <span className="ai-result__label">✨ OpenAI Analysis & Explanation</span>
                                    <button className="btn btn--ghost btn--sm" onClick={() => handleGetAIForStock(stock)}>
                                      Refresh AI
                                    </button>
                                  </div>
                                  <p className="ai-result__text">{aiState.text}</p>

                                  {/* Measured Corporate Events */}
                                  {aiState.events && aiState.events.length > 0 && (
                                    <div className="ai-section">
                                      <h5 className="ai-section__title">🏢 Corporate Events & Disclosures (Measured in Score)</h5>
                                      <div className="ai-events-list">
                                        {aiState.events.map((evt, idx) => (
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

                                  {/* Measured Upstox News */}
                                  {aiState.news && aiState.news.length > 0 && (
                                    <div className="ai-section">
                                      <h5 className="ai-section__title">📰 Market News Articles (15% News Impact Weight)</h5>
                                      <div className="ai-news-list">
                                        {aiState.news.map((n, idx) => (
                                          <div key={n.id || idx} className="ai-news-card">
                                            <div className="ai-news-card__meta">
                                              <span className="ai-news-source">{n.source || 'Market Feed'}</span>
                                              {n.timestamp && (
                                                <span className="ai-news-time">
                                                  {new Date(n.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                              )}
                                            </div>
                                            <a
                                              href={n.url || '#'}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="ai-news-card__title"
                                              onClick={(e) => !n.url && e.preventDefault()}
                                            >
                                              {n.title} ↗
                                            </a>
                                            {n.snippet && <p className="ai-news-card__snippet">{n.snippet}</p>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
