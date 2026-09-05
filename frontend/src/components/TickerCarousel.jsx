import React from 'react';

function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  return '₹' + parseFloat(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(val) {
  if (val == null || isNaN(val)) return '0.00%';
  const num = parseFloat(val);
  const sign = num >= 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

// Full benchmark universe of top Indian stocks for day movers computation
const BENCHMARK_MARKET_POOL = [
  { symbol: 'BEL',        displayName: 'Bharat Electronics', price: 405.35,  changePercent: 3.45 },
  { symbol: 'RVNL',       displayName: 'Rail Vikas Nigam',   price: 212.49,  changePercent: 2.80 },
  { symbol: 'POWERGRID',  displayName: 'Power Grid Corp',    price: 266.00,  changePercent: 1.85 },
  { symbol: 'IRFC',       displayName: 'IRFC Ltd.',          price: 83.40,   changePercent: 1.52 },
  { symbol: 'RELIANCE',   displayName: 'Reliance Ind.',      price: 1322.00, changePercent: 1.50 },
  { symbol: 'ADANIENT',   displayName: 'Adani Enterprises',  price: 2938.00, changePercent: 1.28 },
  { symbol: 'INFY',       displayName: 'Infosys Ltd.',       price: 1950.00, changePercent: 0.85 },
  { symbol: 'HDFCBANK',   displayName: 'HDFC Bank',          price: 1720.00, changePercent: 0.42 },
  { symbol: 'TATAMOTORS', displayName: 'Tata Motors',        price: 311.50,  changePercent: -0.16 },
  { symbol: 'APOLLOHOSP', displayName: 'Apollo Hospitals',  price: 8650.00, changePercent: -0.48 },
  { symbol: 'ZOMATO',     displayName: 'Eternal (Zomato)',   price: 322.75,  changePercent: -0.63 },
  { symbol: 'TATASTEEL',  displayName: 'Tata Steel',         price: 188.79,  changePercent: -1.15 },
  { symbol: 'MARUTI',     displayName: 'Maruti Suzuki',      price: 12694.00,changePercent: -1.27 },
  { symbol: 'IOC',        displayName: 'Indian Oil Corp',    price: 137.60,  changePercent: -1.85 },
];

export default function TickerCarousel({ indexes, stocks = [] }) {
  const nifty = indexes?.nifty;
  const sensex = indexes?.sensex;

  // Merge user's watchlist stocks with market pool to ensure real live quotes take priority
  const stockMap = new Map();

  BENCHMARK_MARKET_POOL.forEach(s => stockMap.set(s.symbol.toUpperCase(), s));

  stocks.forEach(s => {
    if (s.symbol && (s.price != null || s.summary?.currentPrice != null)) {
      stockMap.set(s.symbol.toUpperCase(), {
        symbol: s.symbol,
        displayName: s.displayName || s.symbol,
        price: s.price != null ? s.price : s.summary?.currentPrice,
        changePercent: s.changePercent != null ? s.changePercent : s.summary?.marketChangePercent,
      });
    }
  });

  const allMarketStocks = Array.from(stockMap.values());

  // Sort by changePercent descending to find highest earners (gainers) & highest losers
  const sortedGainers = [...allMarketStocks]
    .filter(s => (s.changePercent || 0) >= 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 5);

  const sortedLosers = [...allMarketStocks]
    .filter(s => (s.changePercent || 0) < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 5);

  // Assemble top ticker items
  const tickerItems = [];

  // 1. Benchmark Indices
  if (nifty) {
    tickerItems.push({
      symbol: 'NIFTY 50',
      price: nifty.price,
      changePercent: nifty.changePercent,
      tag: 'INDEX',
      isIndex: true,
    });
  }

  if (sensex) {
    tickerItems.push({
      symbol: 'SENSEX',
      price: sensex.price,
      changePercent: sensex.changePercent,
      tag: 'INDEX',
      isIndex: true,
    });
  }

  // 2. Top Gainers
  sortedGainers.forEach(s => {
    tickerItems.push({
      symbol: s.symbol,
      price: s.price,
      changePercent: s.changePercent,
      tag: 'GAINER',
      type: 'gainer',
    });
  });

  // 3. Top Losers
  sortedLosers.forEach(s => {
    tickerItems.push({
      symbol: s.symbol,
      price: s.price,
      changePercent: s.changePercent,
      tag: 'LOSER',
      type: 'loser',
    });
  });

  // Duplicate items array to ensure seamless infinite CSS marquee loop
  const displayItems = [...tickerItems, ...tickerItems];

  return (
    <div className="ticker-carousel-container">
      <div className="ticker-label-badge">Gainers & Losers</div>
      <div className="ticker-marquee-track">
        <div className="ticker-marquee-content">
          {displayItems.map((item, idx) => {
            const isUp = (item.changePercent || 0) >= 0;
            return (
              <div key={`${item.symbol}-${idx}`} className="ticker-item">
                <span className={`ticker-tag-label${item.type ? ` ticker-tag-label--${item.type}` : ''}`}>{item.tag}</span>
                <span className={`ticker-symbol ${item.isIndex ? 'ticker-symbol--index' : ''}`}>
                  {item.symbol}
                </span>
                <span className="ticker-price">{fmtPrice(item.price)}</span>
                <span className={`ticker-badge ${isUp ? 'ticker-badge--up' : 'ticker-badge--down'}`}>
                  {isUp ? '▲' : '▼'} {fmtPct(item.changePercent)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
