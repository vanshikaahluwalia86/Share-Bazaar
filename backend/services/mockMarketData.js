/**
 * mockMarketData.js
 *
 * Provides realistic mock Indian market data for development and testing.
 * Activated automatically when ALPHAVANTAGE_API_KEY is not set or is "demo".
 *
 * Prices drift slightly each call to simulate market movement.
 * This lets you test the ENTIRE rule engine + AI flow without an API key.
 *
 * To use real data: set ALPHAVANTAGE_API_KEY in backend/.env
 */

// Base prices (approximate real-world values as of mid-2025)
const BASE_PRICES = {
  RELIANCE:    2950.00,
  TCS:         4200.00,
  INFY:        1950.00,
  HDFCBANK:    1720.00,
  ICICIBANK:    1340.00,
  WIPRO:        580.00,
  BAJFINANCE:  7100.00,
  ASIANPAINT:  3200.00,
  MARUTI:     12500.00,
  TATAMOTORS:   950.00,
  SUNPHARMA:   1680.00,
  NESTLEIND:  25000.00,
  // Index proxy
  'NIFTYBEES.NSE': 265.00,
  'SENSEXBEES.BSE': 835.00,
};

// Per-session price state: drifts slightly to simulate movement
const priceState = {};

function getMockPrice(symbol) {
  const base = BASE_PRICES[symbol] || 1000.00;
  if (!priceState[symbol]) {
    // Randomise ±3% from base on first call
    priceState[symbol] = base * (1 + (Math.random() - 0.5) * 0.06);
  }
  // Drift ±0.5% each subsequent call
  priceState[symbol] *= (1 + (Math.random() - 0.5) * 0.01);
  return parseFloat(priceState[symbol].toFixed(2));
}

function buildMockQuote(symbol, exchange) {
  const price         = getMockPrice(symbol);
  const previousClose = parseFloat((price * (1 + (Math.random() - 0.5) * 0.04)).toFixed(2));
  const changePercent = parseFloat((((price - previousClose) / previousClose) * 100).toFixed(4));

  // Use yesterday's date as the "latest trading day"
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const tradingDay = yesterday.toISOString().split('T')[0];

  return {
    '01. symbol':           `${symbol}.${exchange}`,
    '02. open':             price.toString(),
    '03. high':             (price * 1.01).toFixed(4),
    '04. low':              (price * 0.99).toFixed(4),
    '05. price':            price.toString(),
    '06. volume':           '1234567',
    '07. latest trading day': tradingDay,
    '08. previous close':   previousClose.toString(),
    '09. change':           (price - previousClose).toFixed(4),
    '10. change percent':   `${changePercent}%`,
  };
}

module.exports = { buildMockQuote, BASE_PRICES };
