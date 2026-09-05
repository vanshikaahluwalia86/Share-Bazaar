/**
 * marketData.js
 *
 * Unified Market Data Service supporting Upstox API v2, Alpha Vantage, and Mock data.
 */

const axios = require('axios');
const db = require('../db');
const { buildMockQuote } = require('./mockMarketData');
const upstox = require('./upstoxMarketData');

// ── Config ───────────────────────────────────────────────────────────────────

const PROVIDER = (process.env.MARKET_DATA_PROVIDER || 'mock').toLowerCase();
const AV_BASE_URL = 'https://www.alphavantage.co/query';
const AV_API_KEY  = process.env.ALPHAVANTAGE_API_KEY || 'demo';

const USE_UPSTOX = PROVIDER === 'upstox' && !!process.env.UPSTOX_ACCESS_TOKEN;
const USE_MOCK   = !USE_UPSTOX && (!process.env.ALPHAVANTAGE_API_KEY || process.env.ALPHAVANTAGE_API_KEY === 'demo' || process.env.ALPHAVANTAGE_API_KEY === 'your_alphavantage_api_key_here');

if (USE_UPSTOX) {
  console.log('[MarketData] 🚀 Using UPSTOX API v2 for live market data.');
} else if (USE_MOCK) {
  console.log('[MarketData] ⚠️  Using MOCK market data.');
} else {
  console.log('[MarketData] 📈 Using Alpha Vantage for live market data.');
}

const INDEX_SYMBOL_MAP = {
  NIFTY_50: 'NIFTYBEES.NSE',
  SENSEX:   'SENSEXBEES.BSE',
};

const DEFAULT_INDEX = 'NIFTY_50';

// ── Alpha Vantage API call ────────────────────────────────────────────────────

async function fetchGlobalQuote(avSymbol) {
  if (USE_MOCK) {
    const parts    = avSymbol.split('.');
    const sym      = parts[0];
    const exchange = parts[1] || 'BSE';
    return buildMockQuote(sym, exchange);
  }

  const response = await axios.get(AV_BASE_URL, {
    params: {
      function: 'GLOBAL_QUOTE',
      symbol:   avSymbol,
      apikey:   AV_API_KEY,
    },
    timeout: 10000,
  });

  const data = response.data;
  if (data['Information'] || data['Note']) {
    const msg = data['Information'] || data['Note'];
    throw new Error(`Alpha Vantage rate limit or API key issue: ${msg}`);
  }

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price'] || !quote['07. latest trading day'] || quote['05. price'] === '0.0000') {
    return null;
  }

  return quote;
}

function parseQuote(rawQuote, symbol) {
  const price          = parseFloat(rawQuote['05. price']);
  const previousClose  = parseFloat(rawQuote['08. previous close']);
  const changePercent  = parseFloat((rawQuote['10. change percent'] || '0%').replace('%', ''));
  const tradingDay     = rawQuote['07. latest trading day'];
  const marketDataTs   = new Date(`${tradingDay}T15:30:00+05:30`);

  return {
    symbol,
    price,
    previousClose,
    changePercent,
    marketDataTs,
    fetchedAt: new Date(),
  };
}

// ── DB persistence ───────────────────────────────────────────────────────────

async function saveMarketSnapshot(parsed, rawQuote) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE market_snapshots SET is_latest = FALSE
       WHERE symbol = $1 AND is_latest = TRUE`,
      [parsed.symbol]
    );

    const result = await client.query(
      `INSERT INTO market_snapshots
         (symbol, price, change_percent, previous_close, day_high, day_low, market_data_ts, fetched_at, is_latest, raw_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
       RETURNING *`,
      [
        parsed.symbol,
        parsed.price,
        parsed.changePercent,
        parsed.previousClose,
        parsed.dayHigh || null,
        parsed.dayLow || null,
        parsed.marketDataTs,
        parsed.fetchedAt,
        JSON.stringify(rawQuote),
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function saveIndexSnapshot(indexSymbol, parsed, rawQuote) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE index_snapshots SET is_latest = FALSE
       WHERE index_symbol = $1 AND is_latest = TRUE`,
      [indexSymbol]
    );

    const result = await client.query(
      `INSERT INTO index_snapshots
         (index_symbol, price, change_percent, market_data_ts, fetched_at, is_latest, raw_data)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       RETURNING *`,
      [
        indexSymbol,
        parsed.price,
        parsed.changePercent,
        parsed.marketDataTs,
        parsed.fetchedAt,
        JSON.stringify(rawQuote),
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function isStale(marketDataTs) {
  if (!marketDataTs) return true;
  const ageMs = Date.now() - new Date(marketDataTs).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return ageMs > oneDayMs;
}

// ── Public API ───────────────────────────────────────────────────────────────

async function getStockQuote(symbol, exchange = 'BSE') {
  if (USE_UPSTOX) {
    try {
      const key = await upstox.getInstrumentKey(symbol, exchange);
      const quotes = await upstox.fetchUpstoxQuotes(key);
      // Find matching quote in response object
      const rawQuote = Object.values(quotes)[0];
      if (!rawQuote) {
        throw new Error(`Upstox did not return quote data for ${symbol} (${key})`);
      }
      const parsed   = upstox.parseUpstoxQuote(rawQuote, symbol);
      const snapshot = await saveMarketSnapshot(parsed, rawQuote);
      return {
        symbol,
        exchange,
        price:         parsed.price,
        changePercent: parsed.changePercent,
        previousClose: parsed.previousClose,
        dayHigh:       parsed.dayHigh,
        dayLow:        parsed.dayLow,
        marketDataTs:  parsed.marketDataTs,
        fetchedAt:     parsed.fetchedAt,
        isStale:       isStale(parsed.marketDataTs),
        snapshotId:    snapshot.id,
      };
    } catch (err) {
      console.warn(`[MarketData] Upstox fetch failed for ${symbol}: ${err.message}. Using stored quote / mock fallback.`);
      const stored = await getLatestStoredQuote(symbol);
      if (stored) {
        return {
          symbol: stored.symbol,
          exchange,
          price: parseFloat(stored.price),
          changePercent: parseFloat(stored.change_percent || 0),
          previousClose: parseFloat(stored.previous_close || stored.price),
          dayHigh: stored.day_high ? parseFloat(stored.day_high) : null,
          dayLow: stored.day_low ? parseFloat(stored.day_low) : null,
          marketDataTs: stored.market_data_ts,
          fetchedAt: stored.fetched_at,
          isStale: true,
          snapshotId: stored.id,
        };
      }
      const mockRaw = buildMockQuote(symbol, exchange);
      const parsed = parseQuote(mockRaw, symbol);
      const snapshot = await saveMarketSnapshot(parsed, mockRaw);
      return {
        symbol,
        exchange,
        price: parsed.price,
        changePercent: parsed.changePercent,
        previousClose: parsed.previousClose,
        marketDataTs: parsed.marketDataTs,
        fetchedAt: parsed.fetchedAt,
        isStale: false,
        snapshotId: snapshot.id,
      };
    }
  }

  try {
    const avSymbol = `${symbol}.${exchange}`;
    const rawQuote = await fetchGlobalQuote(avSymbol);
    if (!rawQuote) {
      throw new Error(`No valid market data for ${avSymbol}.`);
    }

    const parsed   = parseQuote(rawQuote, symbol);
    const snapshot = await saveMarketSnapshot(parsed, rawQuote);

    return {
      symbol,
      exchange,
      price:         parsed.price,
      changePercent: parsed.changePercent,
      previousClose: parsed.previousClose,
      marketDataTs:  parsed.marketDataTs,
      fetchedAt:     parsed.fetchedAt,
      isStale:       isStale(parsed.marketDataTs),
      snapshotId:    snapshot.id,
    };
  } catch (err) {
    console.warn(`[MarketData] Global quote fetch failed for ${symbol}: ${err.message}. Using stored quote / mock fallback.`);
    const stored = await getLatestStoredQuote(symbol);
    if (stored) {
      return {
        symbol: stored.symbol,
        exchange,
        price: parseFloat(stored.price),
        changePercent: parseFloat(stored.change_percent || 0),
        previousClose: parseFloat(stored.previous_close || stored.price),
        dayHigh: stored.day_high ? parseFloat(stored.day_high) : null,
        dayLow: stored.day_low ? parseFloat(stored.day_low) : null,
        marketDataTs: stored.market_data_ts,
        fetchedAt: stored.fetched_at,
        isStale: true,
        snapshotId: stored.id,
      };
    }
    const mockRaw = buildMockQuote(symbol, exchange);
    const parsed = parseQuote(mockRaw, symbol);
    const snapshot = await saveMarketSnapshot(parsed, mockRaw);
    return {
      symbol,
      exchange,
      price: parsed.price,
      changePercent: parsed.changePercent,
      previousClose: parsed.previousClose,
      marketDataTs: parsed.marketDataTs,
      fetchedAt: parsed.fetchedAt,
      isStale: false,
      snapshotId: snapshot.id,
    };
  }
}

async function getIndexQuote(indexId = DEFAULT_INDEX) {
  if (USE_UPSTOX) {
    try {
      const key = await upstox.getInstrumentKey(indexId, 'NSE');
      const quotes = await upstox.fetchUpstoxQuotes(key);
      const rawQuote = Object.values(quotes)[0];
      if (!rawQuote) {
        throw new Error(`Upstox did not return index data for ${indexId} (${key})`);
      }
      const parsed   = upstox.parseUpstoxQuote(rawQuote, indexId);
      const snapshot = await saveIndexSnapshot(indexId, parsed, rawQuote);
      return {
        indexId,
        price:         parsed.price,
        changePercent: parsed.changePercent,
        marketDataTs:  parsed.marketDataTs,
        fetchedAt:     parsed.fetchedAt,
        isStale:       isStale(parsed.marketDataTs),
        snapshotId:    snapshot.id,
      };
    } catch (err) {
      console.warn(`[MarketData] Upstox index fetch failed for ${indexId}: ${err.message}. Using stored index / mock fallback.`);
      const stored = await getLatestStoredIndex(indexId);
      if (stored) {
        return {
          indexId: stored.index_symbol,
          price: parseFloat(stored.price),
          changePercent: parseFloat(stored.change_percent || 0),
          marketDataTs: stored.market_data_ts,
          fetchedAt: stored.fetched_at,
          isStale: true,
          snapshotId: stored.id,
        };
      }
      const mockPrice = indexId === 'SENSEX' ? 74200.00 : 22500.00;
      const mockChange = 0.45;
      const mockParsed = {
        price: mockPrice,
        changePercent: mockChange,
        marketDataTs: new Date(),
        fetchedAt: new Date(),
      };
      const snapshot = await saveIndexSnapshot(indexId, mockParsed, { mock: true });
      return {
        indexId,
        price: mockParsed.price,
        changePercent: mockParsed.changePercent,
        marketDataTs: mockParsed.marketDataTs,
        fetchedAt: mockParsed.fetchedAt,
        isStale: false,
        snapshotId: snapshot.id,
      };
    }
  }

  try {
    const avSymbol = INDEX_SYMBOL_MAP[indexId];
    if (!avSymbol) {
      throw new Error(`Unknown index: ${indexId}.`);
    }

    const rawQuote = await fetchGlobalQuote(avSymbol);
    if (!rawQuote) {
      throw new Error(`No valid index data for ${indexId}`);
    }

    const parsed   = parseQuote(rawQuote, avSymbol);
    const snapshot = await saveIndexSnapshot(indexId, parsed, rawQuote);

    return {
      indexId,
      avSymbol,
      price:         parsed.price,
      changePercent: parsed.changePercent,
      marketDataTs:  parsed.marketDataTs,
      fetchedAt:     parsed.fetchedAt,
      isStale:       isStale(parsed.marketDataTs),
      snapshotId:    snapshot.id,
    };
  } catch (err) {
    console.warn(`[MarketData] Index fetch failed for ${indexId}: ${err.message}. Using stored index / mock fallback.`);
    const stored = await getLatestStoredIndex(indexId);
    if (stored) {
      return {
        indexId: stored.index_symbol,
        price: parseFloat(stored.price),
        changePercent: parseFloat(stored.change_percent || 0),
        marketDataTs: stored.market_data_ts,
        fetchedAt: stored.fetched_at,
        isStale: true,
        snapshotId: stored.id,
      };
    }
    const mockPrice = indexId === 'SENSEX' ? 74200.00 : 22500.00;
    const mockChange = 0.45;
    const mockParsed = {
      price: mockPrice,
      changePercent: mockChange,
      marketDataTs: new Date(),
      fetchedAt: new Date(),
    };
    const snapshot = await saveIndexSnapshot(indexId, mockParsed, { mock: true });
    return {
      indexId,
      price: mockParsed.price,
      changePercent: mockParsed.changePercent,
      marketDataTs: mockParsed.marketDataTs,
      fetchedAt: mockParsed.fetchedAt,
      isStale: false,
      snapshotId: snapshot.id,
    };
  }
}

async function getLatestStoredQuote(symbol) {
  const result = await db.query(
    `SELECT * FROM market_snapshots
     WHERE symbol = $1 AND is_latest = TRUE
     LIMIT 1`,
    [symbol]
  );
  return result.rows[0] || null;
}

async function getLatestStoredIndex(indexId = DEFAULT_INDEX) {
  const result = await db.query(
    `SELECT * FROM index_snapshots
     WHERE index_symbol = $1 AND is_latest = TRUE
     LIMIT 1`,
    [indexId]
  );
  return result.rows[0] || null;
}

async function getBothIndexes() {
  if (USE_UPSTOX) {
    try {
      const keys = ['NSE_INDEX|Nifty 50', 'BSE_INDEX|SENSEX'];
      const quotes = await upstox.fetchUpstoxQuotes(keys);
      const niftyRaw = quotes['NSE_INDEX:Nifty 50'];
      const sensexRaw = quotes['BSE_INDEX:SENSEX'];

      const niftyParsed = niftyRaw ? upstox.parseUpstoxQuote(niftyRaw, 'NIFTY_50') : null;
      const sensexParsed = sensexRaw ? upstox.parseUpstoxQuote(sensexRaw, 'SENSEX') : null;

      if (niftyParsed) await saveIndexSnapshot('NIFTY_50', niftyParsed, niftyRaw);
      if (sensexParsed) await saveIndexSnapshot('SENSEX', sensexParsed, sensexRaw);

      if (niftyParsed || sensexParsed) {
        return {
          nifty: niftyParsed ? {
            indexId: 'NIFTY_50',
            displayName: 'NIFTY 50',
            price: niftyParsed.price,
            changePercent: niftyParsed.changePercent,
            changeAmount: niftyParsed.changeAmount,
            dayHigh: niftyParsed.dayHigh,
            dayLow: niftyParsed.dayLow,
            marketDataTs: niftyParsed.marketDataTs,
            isStale: isStale(niftyParsed.marketDataTs),
          } : null,
          sensex: sensexParsed ? {
            indexId: 'SENSEX',
            displayName: 'SENSEX',
            price: sensexParsed.price,
            changePercent: sensexParsed.changePercent,
            changeAmount: sensexParsed.changeAmount,
            dayHigh: sensexParsed.dayHigh,
            dayLow: sensexParsed.dayLow,
            marketDataTs: sensexParsed.marketDataTs,
            isStale: isStale(sensexParsed.marketDataTs),
          } : null,
        };
      }
    } catch (err) {
      console.warn('[MarketData] Upstox both indexes fetch failed, using fallback:', err.message);
    }
  }

  // Fallback / mock
  const niftyQuote = await getIndexQuote('NIFTY_50');
  const sensexQuote = await getIndexQuote('SENSEX');
  return {
    nifty: {
      indexId: 'NIFTY_50',
      displayName: 'NIFTY 50',
      price: niftyQuote.price,
      changePercent: niftyQuote.changePercent,
      changeAmount: parseFloat(((niftyQuote.price * niftyQuote.changePercent) / 100).toFixed(2)),
      dayHigh: parseFloat((niftyQuote.price * 1.004).toFixed(2)),
      dayLow: parseFloat((niftyQuote.price * 0.996).toFixed(2)),
      marketDataTs: niftyQuote.marketDataTs,
      isStale: niftyQuote.isStale,
    },
    sensex: {
      indexId: 'SENSEX',
      displayName: 'SENSEX',
      price: sensexQuote.price,
      changePercent: sensexQuote.changePercent,
      changeAmount: parseFloat(((sensexQuote.price * sensexQuote.changePercent) / 100).toFixed(2)),
      dayHigh: parseFloat((sensexQuote.price * 1.004).toFixed(2)),
      dayLow: parseFloat((sensexQuote.price * 0.996).toFixed(2)),
      marketDataTs: sensexQuote.marketDataTs,
      isStale: sensexQuote.isStale,
    },
  };
}

module.exports = {
  getStockQuote,
  getIndexQuote,
  getBothIndexes,
  getLatestStoredQuote,
  getLatestStoredIndex,
  isStale,
  DEFAULT_INDEX,
  INDEX_SYMBOL_MAP,
};
