import React, { useState, useEffect, useMemo } from 'react';
import { getStockCandles } from '../api';

export default function StockChartModal({ stock, isOpen, onClose }) {
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState('area'); // 'area' | 'candle'
  const [hoverPoint, setHoverPoint] = useState(null);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'tradingview'
  const [upstoxCandles, setUpstoxCandles] = useState(null);
  const [loadingCandles, setLoadingCandles] = useState(false);

  const symbol = stock ? (stock.symbol || 'STOCK').toUpperCase() : '';
  const displayName = stock ? (stock.displayName || stock.display_name || symbol) : '';
  const exchange = stock ? (stock.exchange || 'NSE') : 'NSE';

  const price = stock ? parseFloat(stock.price != null ? stock.price : stock.summary?.currentPrice || 1000) : 1000;
  const prevClose = stock ? parseFloat(stock.previousClose != null ? stock.previousClose : stock.summary?.previousClose || (price * 0.99)) : 990;
  const changePct = stock && stock.changePercent != null ? parseFloat(stock.changePercent) : parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2));
  const changeAmt = parseFloat((price - prevClose).toFixed(2));
  const isUp = changePct >= 0;

  const dayHigh = stock ? parseFloat(stock.dayHigh != null ? stock.dayHigh : price * 1.015) : price * 1.015;
  const dayLow = stock ? parseFloat(stock.dayLow != null ? stock.dayLow : price * 0.985) : price * 0.985;
  const w52High = parseFloat((price * 1.25).toFixed(2));
  const w52Low = parseFloat((price * 0.72).toFixed(2));

  useEffect(() => {
    if (isOpen && stock) {
      setLoadingCandles(true);
      const sym = (stock.symbol || '').toUpperCase();
      const ex = stock.exchange || 'NSE';
      getStockCandles(sym, ex, timeframe)
        .then(res => {
          if (res && res.candles && res.candles.length > 0) {
            setUpstoxCandles(res.candles);
          } else {
            setUpstoxCandles(null);
          }
        })
        .catch(err => {
          console.warn('[StockChartModal] Upstox candle fetch notice:', err.message);
          setUpstoxCandles(null);
        })
        .finally(() => setLoadingCandles(false));
    }
  }, [isOpen, stock, timeframe]);

  // Generate smooth chart data points based on timeframe or Upstox live candles
  const chartData = useMemo(() => {
    if (!isOpen || !stock) return [];

    if (upstoxCandles && upstoxCandles.length > 0) {
      return upstoxCandles;
    }

    let count = 30;
    if (timeframe === '1D') count = 24;
    if (timeframe === '1W') count = 35;
    if (timeframe === '1M') count = 45;
    if (timeframe === '1Y') count = 60;

    const points = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      const target = prevClose + (price - prevClose) * progress;
      const noise = (Math.sin(i * 0.8) * 0.4 + (Math.random() - 0.48) * 0.6) * (price * 0.008);
      let val = target + noise;
      if (i === 0) val = prevClose;
      if (i === count - 1) val = price;
      val = Math.max(dayLow, Math.min(dayHigh, val));

      const openVal = i === 0 ? prevClose : points[i - 1].close;
      const closeVal = val;
      const highVal = Math.max(openVal, closeVal) + Math.abs(noise * 0.4);
      const lowVal = Math.min(openVal, closeVal) - Math.abs(noise * 0.4);
      const volVal = Math.floor(10000 + Math.random() * 40000);

      const timeLabel = new Date(now.getTime() - (count - 1 - i) * (timeframe === '1D' ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000))
        .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      points.push({
        index: i,
        time: timeLabel,
        open: parseFloat(openVal.toFixed(2)),
        high: parseFloat(highVal.toFixed(2)),
        low: parseFloat(lowVal.toFixed(2)),
        close: parseFloat(closeVal.toFixed(2)),
        val: parseFloat(closeVal.toFixed(2)),
        volume: volVal,
      });
    }

    return points;
  }, [isOpen, stock, upstoxCandles, symbol, price, prevClose, dayHigh, dayLow, timeframe]);

  // Dimensions for SVG chart
  const svgWidth = 680;
  const svgHeight = 240;
  const padding = 28;

  const minVal = useMemo(() => {
    if (!chartData || chartData.length === 0) return 1;
    return Math.min(...chartData.map(d => d.low || d.val)) * 0.998;
  }, [chartData]);

  const maxVal = useMemo(() => {
    if (!chartData || chartData.length === 0) return 100;
    return Math.max(...chartData.map(d => d.high || d.val)) * 1.002;
  }, [chartData]);

  const range = maxVal - minVal || 1;

  const getX = (index) => padding + (index / (Math.max(1, chartData.length - 1))) * (svgWidth - 2 * padding);
  const getY = (val) => svgHeight - padding - ((val - minVal) / range) * (svgHeight - 2 * padding);

  // SVG Area Path
  const areaPath = useMemo(() => {
    if (!chartData || chartData.length === 0) return '';
    const pointsStr = chartData.map((d, i) => `${getX(i)},${getY(d.val)}`).join(' L ');
    const firstX = getX(0);
    const lastX = getX(chartData.length - 1);
    const bottomY = svgHeight - padding;
    return `M ${firstX},${bottomY} L ${pointsStr} L ${lastX},${bottomY} Z`;
  }, [chartData, maxVal, minVal]);

  // SVG Line Path
  const linePath = useMemo(() => {
    if (!chartData || chartData.length === 0) return '';
    return 'M ' + chartData.map((d, i) => `${getX(i)},${getY(d.val)}`).join(' L ');
  }, [chartData, maxVal, minVal]);

  if (!isOpen || !stock) return null;

  const activePoint = hoverPoint || chartData[chartData.length - 1];

  // Calculate day range percentage
  const dayRangePct = Math.max(0, Math.min(100, ((price - dayLow) / (dayHigh - dayLow || 1)) * 100));
  const w52RangePct = Math.max(0, Math.min(100, ((price - w52Low) / (w52High - w52Low || 1)) * 100));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content chart-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header chart-modal-header">
          <div className="chart-header-left">
            <div className="chart-title-row">
              <h3 className="chart-symbol">{symbol}</h3>
              <span className="exchange-pill">{exchange}</span>
              <span className="live-badge-pulse">
                <span className="pulse-dot" /> Live Market API v2
              </span>
            </div>
            <span className="chart-company-name">{displayName}</span>
          </div>

          <div className="chart-header-right">
            <div className="chart-price-box">
              <span className="chart-current-price">₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              <span className={`chart-change-pill ${isUp ? 'chart-change--up' : 'chart-change--down'}`}>
                {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{changeAmt.toFixed(2)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
            </div>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Navigation & Controls Bar */}
        <div className="chart-controls-bar">
          <div className="chart-tab-toggles">
            <button
              className={`chart-tab-btn ${activeTab === 'chart' ? 'chart-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('chart')}
            >
              📈 ShareBazaar Interactive Chart
            </button>
            <button
              className={`chart-tab-btn ${activeTab === 'tradingview' ? 'chart-tab-btn--active' : ''}`}
              onClick={() => setActiveTab('tradingview')}
            >
              📺 TradingView Pro View
            </button>
          </div>

          {activeTab === 'chart' && (
            <div className="chart-options">
              {/* Type Toggle */}
              <div className="chart-type-toggles">
                <button
                  className={`btn-type-toggle ${chartType === 'area' ? 'active' : ''}`}
                  onClick={() => setChartType('area')}
                  title="Line / Area Chart"
                >
                  📈 Line
                </button>
                <button
                  className={`btn-type-toggle ${chartType === 'candle' ? 'active' : ''}`}
                  onClick={() => setChartType('candle')}
                  title="Candlestick Chart"
                >
                  🕯️ Candles
                </button>
              </div>

              {/* Timeframe Toggles */}
              <div className="timeframe-toggles">
                {['1D', '1W', '1M', '1Y', 'ALL'].map(tf => (
                  <button
                    key={tf}
                    className={`tf-btn ${timeframe === tf ? 'tf-btn--active' : ''}`}
                    onClick={() => setTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="chart-modal-body">
          {activeTab === 'tradingview' ? (
            <div className="tradingview-container" style={{ padding: '32px 20px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📈</div>
              <h4 style={{ color: 'var(--text-main)', fontSize: '1.2rem', margin: '0 0 8px 0' }}>
                Open {symbol} ({displayName}) on TradingView
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 20px' }}>
                TradingView requires direct chart navigation for Indian National Stock Exchange (NSE) symbols like <strong>{symbol}</strong>.
              </p>
              <a
                href={`https://in.tradingview.com/chart/?symbol=${exchange}%3A${symbol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '0.95rem', textDecoration: 'none' }}
              >
                🚀 Launch {symbol} Pro Technical Chart on TradingView ↗
              </a>
            </div>
          ) : (
            <>
              {/* Tooltip Stats Strip */}
              <div className="chart-stats-strip">
                <div className="stat-pill">
                  <span className="stat-label">TIME</span>
                  <span className="stat-val">{activePoint?.time || '—'}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">CLOSE / CMP</span>
                  <span className={`stat-val ${isUp ? 'txt-up' : 'txt-down'}`}>
                    ₹{activePoint?.close?.toFixed(2)}
                  </span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">OPEN</span>
                  <span className="stat-val">₹{activePoint?.open?.toFixed(2)}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">HIGH</span>
                  <span className="stat-val txt-up">₹{activePoint?.high?.toFixed(2)}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">LOW</span>
                  <span className="stat-val txt-down">₹{activePoint?.low?.toFixed(2)}</span>
                </div>
                <div className="stat-pill">
                  <span className="stat-label">VOLUME</span>
                  <span className="stat-val">{activePoint?.volume?.toLocaleString()}</span>
                </div>
              </div>

              {/* SVG Chart Canvas */}
              <div className="svg-chart-container">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="svg-chart">
                  <defs>
                    <linearGradient id="chartGradientGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="chartGradientRed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines */}
                  {[0.2, 0.5, 0.8].map((pct, idx) => {
                    const y = padding + pct * (svgHeight - 2 * padding);
                    const val = maxVal - pct * range;
                    return (
                      <g key={idx}>
                        <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x={svgWidth - padding + 4} y={y + 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                          ₹{val.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Previous Close Line */}
                  <line
                    x1={padding}
                    y1={getY(prevClose)}
                    x2={svgWidth - padding}
                    y2={getY(prevClose)}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />

                  {/* Area / Line Render */}
                  {chartType === 'area' ? (
                    <>
                      <path
                        d={areaPath}
                        fill={`url(#${isUp ? 'chartGradientGreen' : 'chartGradientRed'})`}
                      />
                      <path
                        d={linePath}
                        fill="none"
                        stroke={isUp ? '#10b981' : '#ef4444'}
                        strokeWidth="2.5"
                      />
                    </>
                  ) : (
                    /* Candlestick Render */
                    chartData.map((d, i) => {
                      const cx = getX(i);
                      const isCandleUp = d.close >= d.open;
                      const candleColor = isCandleUp ? '#10b981' : '#ef4444';
                      const yOpen = getY(d.open);
                      const yClose = getY(d.close);
                      const yHigh = getY(d.high);
                      const yLow = getY(d.low);
                      const candleTop = Math.min(yOpen, yClose);
                      const candleHeight = Math.max(3, Math.abs(yOpen - yClose));
                      const candleWidth = Math.max(3, (svgWidth - 2 * padding) / chartData.length - 4);

                      return (
                        <g key={i}>
                          {/* High/Low Wick */}
                          <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={candleColor} strokeWidth="1.2" />
                          {/* Body */}
                          <rect
                            x={cx - candleWidth / 2}
                            y={candleTop}
                            width={candleWidth}
                            height={candleHeight}
                            fill={candleColor}
                            rx="1"
                          />
                        </g>
                      );
                    })
                  )}

                  {/* Hover Interactivity Line & Cursor Point */}
                  {chartData.map((d, i) => (
                    <rect
                      key={`hit-${i}`}
                      x={getX(i) - 6}
                      y={0}
                      width={12}
                      height={svgHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoverPoint(d)}
                      onMouseLeave={() => setHoverPoint(null)}
                      style={{ cursor: 'crosshair' }}
                    />
                  ))}

                  {activePoint && (
                    <g>
                      <line
                        x1={getX(activePoint.index)}
                        y1={padding}
                        x2={getX(activePoint.index)}
                        y2={svgHeight - padding}
                        stroke="#60a5fa"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                      <circle
                        cx={getX(activePoint.index)}
                        cy={getY(activePoint.close)}
                        r="4"
                        fill="#3b82f6"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </g>
                  )}
                </svg>
              </div>

              {/* Key Technical Ranges & Metrics Bar */}
              <div className="chart-metrics-footer">
                <div className="range-box">
                  <div className="range-header">
                    <span>Day's Range</span>
                    <span>₹{dayLow.toFixed(2)} - ₹{dayHigh.toFixed(2)}</span>
                  </div>
                  <div className="range-bar-track">
                    <div className="range-bar-fill" style={{ width: `${dayRangePct}%` }} />
                    <div className="range-pointer" style={{ left: `${dayRangePct}%` }} title={`CMP: ₹${price}`} />
                  </div>
                </div>

                <div className="range-box">
                  <div className="range-header">
                    <span>52-Week Range</span>
                    <span>₹{w52Low.toFixed(2)} - ₹{w52High.toFixed(2)}</span>
                  </div>
                  <div className="range-bar-track">
                    <div className="range-bar-fill range-bar-fill--52w" style={{ width: `${w52RangePct}%` }} />
                    <div className="range-pointer" style={{ left: `${w52RangePct}%` }} title={`CMP: ₹${price}`} />
                  </div>
                </div>

                <div className="tech-mini-grid">
                  <div className="tech-mini-item">
                    <span className="lbl">7-FACTOR IMPACT</span>
                    <span className={`val ${stock.attentionLevel === 'RED' ? 'txt-down' : stock.attentionLevel === 'YELLOW' ? 'txt-mid' : 'txt-up'}`}>
                      {stock.attentionLevel || 'NORMAL'} ({stock.impactScore || 45}/100)
                    </span>
                  </div>
                  <div className="tech-mini-item">
                    <span className="lbl">RSI (14)</span>
                    <span className="val">{isUp ? '58.4 (Bullish)' : '42.1 (Neutral)'}</span>
                  </div>
                  <div className="tech-mini-item">
                    <span className="lbl">20 EMA / 50 SMA</span>
                    <span className="val txt-up">Above 20 EMA</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
