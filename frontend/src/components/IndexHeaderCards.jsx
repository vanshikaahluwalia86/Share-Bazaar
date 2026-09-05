import React from 'react';

function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export default function IndexHeaderCards({ indexes }) {
  const nifty = indexes?.nifty;
  const sensex = indexes?.sensex;

  return (
    <div className="index-header-container">
      {/* NIFTY 50 Card */}
      <div className="index-card">
        <div className="index-card__top">
          <span className="index-name">NIFTY 50</span>
          <span className="live-indicator">● Live Streaming</span>
        </div>

        {nifty ? (
          <>
            <div className="index-card__price-row">
              <span className="index-price">{fmtPrice(nifty.price)}</span>
              <div className="index-change-group">
                <span className={`index-pct ${nifty.changePercent >= 0 ? 'txt-up' : 'txt-down'}`}>
                  {fmtPct(nifty.changePercent)}
                </span>
                <span className={`index-amt ${nifty.changePercent >= 0 ? 'txt-up' : 'txt-down'}`}>
                  ({fmtAmt(nifty.changeAmount)})
                </span>
              </div>
            </div>

            <div className="index-card__details">
              <div className="detail-pill">
                <span className="pill-lbl">Day High</span>
                <span className="pill-val">{fmtPrice(nifty.dayHigh)}</span>
              </div>
              <div className="detail-pill">
                <span className="pill-lbl">Day Low</span>
                <span className="pill-val">{fmtPrice(nifty.dayLow)}</span>
              </div>
              <div className="detail-pill">
                <span className="pill-lbl">Data As Of</span>
                <span className="pill-val">
                  {nifty.marketDataTs
                    ? new Date(nifty.marketDataTs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="loading-state" style={{ padding: 12 }}>Loading NIFTY 50 data…</div>
        )}
      </div>

      {/* SENSEX Card */}
      <div className="index-card">
        <div className="index-card__top">
          <span className="index-name">SENSEX</span>
          <span className="live-indicator">● Live Streaming</span>
        </div>

        {sensex ? (
          <>
            <div className="index-card__price-row">
              <span className="index-price">{fmtPrice(sensex.price)}</span>
              <div className="index-change-group">
                <span className={`index-pct ${sensex.changePercent >= 0 ? 'txt-up' : 'txt-down'}`}>
                  {fmtPct(sensex.changePercent)}
                </span>
                <span className={`index-amt ${sensex.changePercent >= 0 ? 'txt-up' : 'txt-down'}`}>
                  ({fmtAmt(sensex.changeAmount)})
                </span>
              </div>
            </div>

            <div className="index-card__details">
              <div className="detail-pill">
                <span className="pill-lbl">Day High</span>
                <span className="pill-val">{fmtPrice(sensex.dayHigh)}</span>
              </div>
              <div className="detail-pill">
                <span className="pill-lbl">Day Low</span>
                <span className="pill-val">{fmtPrice(sensex.dayLow)}</span>
              </div>
              <div className="detail-pill">
                <span className="pill-lbl">Data As Of</span>
                <span className="pill-val">
                  {sensex.marketDataTs
                    ? new Date(sensex.marketDataTs).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : 'Just now'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="loading-state" style={{ padding: 12 }}>Loading SENSEX data…</div>
        )}
      </div>
    </div>
  );
}
