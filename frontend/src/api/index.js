/**
 * api/index.js
 * All backend API calls live here.
 */

import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Automatically attach Authorization header if token exists in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smw_auth_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────────

/** Register a new user and trigger OTP */
export const register = ({ username, email, password }) =>
  api.post('/auth/register', { username, email, password }).then(r => r.data);

/** Verify OTP to complete registration */
export const verifyOtp = ({ email, otp }) =>
  api.post('/auth/verify-otp', { email, otp }).then(r => r.data);

/** Resend a new OTP */
export const resendOtp = (email) =>
  api.post('/auth/resend-otp', { email }).then(r => r.data);

/** Login with email and password */
export const login = ({ email, password }) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

/** Logout session */
export const logout = () =>
  api.post('/auth/logout').then(r => r.data);

/** Get current authenticated user details */
export const getMe = () =>
  api.get('/auth/me').then(r => r.data);


// ── Market ───────────────────────────────────────────────────────────────────

export const getAttention = (watchlistId) =>
  api.get('/market/attention', { params: { watchlist_id: watchlistId } }).then(r => r.data);

export const getIndexes = () =>
  api.get('/market/indexes').then(r => r.data);

export const getStockCandles = (symbol, exchange = 'NSE', timeframe = '1D') =>
  api.get(`/market/candles/${symbol}`, { params: { exchange, timeframe } }).then(r => r.data);

export const getNewsStream = (symbols = []) =>
  api.get('/market/news', { params: { symbols: symbols.join(',') } }).then(r => r.data);

export const refreshMarket = () =>
  api.post('/market/refresh').then(r => r.data);

// ── Multi-Watchlist CRUD ─────────────────────────────────────────────────────

export const getWatchlistsAll = () =>
  api.get('/watchlist/all').then(r => r.data);

export const createWatchlist = ({ name, isDefault }) =>
  api.post('/watchlist/create', { name, isDefault }).then(r => r.data);

export const updateWatchlist = (id, { name, isDefault }) =>
  api.put(`/watchlist/${id}`, { name, isDefault }).then(r => r.data);

export const deleteWatchlist = (id) =>
  api.delete(`/watchlist/${id}`).then(r => r.data);

// ── 100-Stock Pulse Universe ─────────────────────────────────────────────────

export const getPulseUniverse = ({ group = 'ALL', search = '' }) =>
  api.get('/watchlist/universe', { params: { group, search } }).then(r => r.data);

// ── Watchlist Stock Management ───────────────────────────────────────────────

export const getWatchlist = (watchlistId) =>
  api.get('/watchlist', { params: { watchlist_id: watchlistId } }).then(r => r.data);

export const addStock = ({ symbol, displayName, exchange = 'NSE', watchlistId }) => {
  console.log('[API] Sending POST /watchlist/stocks:', { symbol, displayName, exchange, watchlistId });
  return api.post('/watchlist/stocks', { symbol, displayName, exchange, watchlistId })
    .then(r => {
      console.log('[API] POST /watchlist/stocks success response:', r.data);
      return r.data;
    })
    .catch(err => {
      console.error('[API] POST /watchlist/stocks error:', err.response ? err.response.data : err.message);
      throw err;
    });
};

export const removeStock = (id) =>
  api.delete(`/watchlist/stocks/${id}`).then(r => r.data);

// ── Last-seen ────────────────────────────────────────────────────────────────

export const acknowledgeStock = (watchlistStockId) =>
  api.post(`/watchlist/stocks/${watchlistStockId}/acknowledge`).then(r => r.data);

export const markAsSeen = (watchlistStockId) =>
  api.post(`/watchlist/stocks/${watchlistStockId}/mark-seen`).then(r => r.data);

// ── AI Explanation ───────────────────────────────────────────────────────────

export const getAIExplanation = (summary) =>
  api.post('/ai/explain', { summary }).then(r => r.data);
