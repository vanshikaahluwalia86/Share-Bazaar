import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomeTab from './components/HomeTab';
import WatchlistTab from './components/WatchlistTab';
import NewsFeed from './components/NewsFeed';
import MarketSummary from './components/MarketSummary';
import AttentionSection from './components/AttentionSection';
import DetailedTableView from './components/DetailedTableView';
import AddStockForm from './components/AddStockForm';
import WatchlistTabs from './components/WatchlistTabs';
import PulseUniverseModal from './components/PulseUniverseModal';
import ColumnCustomizerModal, { ALL_COLUMNS } from './components/ColumnCustomizerModal';
import StockChartModal from './components/StockChartModal';
import AuthPage from './components/AuthPage';

import {
  getAttention,
  getIndexes,
  getNewsStream,
  getWatchlistsAll,
  createWatchlist,
  updateWatchlist,
  deleteWatchlist,
  addStock,
  removeStock,
  acknowledgeStock,
  markAsSeen,
  getAIExplanation,
  getMe,
  logout as apiLogout,
} from './api';
import './App.css';

const DEFAULT_COLS = ALL_COLUMNS.filter(c => c.default).map(c => c.id);

export default function App() {
  const [currentUser,        setCurrentUser]        = useState(null);
  const [authChecking,       setAuthChecking]       = useState(true);

  const [navTab,             setNavTab]             = useState('home'); // 'home' default
  const [watchlists,         setWatchlists]         = useState([]);
  const [activeWlId,         setActiveWlId]         = useState(null);
  const [data,               setData]               = useState({ index: null, stocks: [], counts: {} });
  const [indexesData,        setIndexesData]        = useState(null);
  const [newsData,           setNewsData]           = useState({ watchlistNews: [], generalNews: [] });
  const [loading,            setLoading]            = useState(true);
  const [actionLoading,      setActionLoading]      = useState(false);
  const [error,              setError]              = useState(null);

  // View toggle, chart modal & column customizer state
  const [viewMode,           setViewMode]           = useState('cards'); // 'cards' | 'table'
  const [isUniverseOpen,     setUniverseOpen]       = useState(false);
  const [isColModalOpen,     setColModalOpen]       = useState(false);
  const [selectedChartStock, setSelectedChartStock] = useState(null);
  const [visibleColumns, setVisibleColumns]  = useState(() => {
    try {
      const saved = localStorage.getItem('smart_watchlist_cols');
      return saved ? JSON.parse(saved) : DEFAULT_COLS;
    } catch {
      return DEFAULT_COLS;
    }
  });

  // ── Theme State (Default: light, persisted in localStorage) ─────────────────
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('sharebazaar_theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('sharebazaar_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    document.title = 'Share Market Today';
  }, []);

  // Check auth status on initial load
  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('smw_auth_token');
      if (!token) {
        setAuthChecking(false);
        return;
      }
      try {
        const userData = await getMe();
        setCurrentUser(userData.user);
      } catch (err) {
        console.warn('[Auth] Token verification failed:', err.message);
        localStorage.removeItem('smw_auth_token');
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, []);

  const handleAuthSuccess = (user, token) => {
    if (token) {
      localStorage.setItem('smw_auth_token', token);
    }
    setCurrentUser(user);
    loadWatchlists();
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem('smw_auth_token');
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('smart_watchlist_cols', JSON.stringify(visibleColumns));
    } catch (e) {
      console.warn('Failed to save column prefs:', e);
    }
  }, [visibleColumns]);

  // Initial load when user is authenticated
  useEffect(() => {
    if (currentUser) {
      loadWatchlists();
    }
  }, [currentUser]);

  // Fetch attention data when activeWatchlistId changes
  useEffect(() => {
    if (activeWlId) {
      fetchAttentionData(activeWlId);
    }
  }, [activeWlId]);

  // Real-time Background Auto-Polling (Every 15 Seconds)
  useEffect(() => {
    fetchIndexesAndNews();
    const interval = setInterval(() => {
      fetchIndexesAndNews();
      if (activeWlId) {
        fetchAttentionData(activeWlId, true); // silent background poll
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [activeWlId]);

  async function loadWatchlists() {
    try {
      const res = await getWatchlistsAll();
      const wls = res.watchlists || [];
      setWatchlists(wls);
      if (wls.length > 0) {
        setActiveWlId(prev => {
          if (prev && wls.some(w => w.id === prev)) {
            return prev;
          }
          const defaultWl = wls.find(w => w.is_default) || wls[0];
          return defaultWl.id;
        });
      }
    } catch (err) {
      console.error('[Dashboard] Error loading watchlists:', err);
      setError('Failed to load watchlists.');
    }
  }

  async function fetchAttentionData(wlId, silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await getAttention(wlId);
      setData({
        index:  res.index,
        stocks: res.stocks || [],
        counts: res.counts || {},
      });
      setError(null);
    } catch (err) {
      console.error('[Dashboard] Error fetching attention data:', err);
      if (!silent) setError(err.response?.data?.error || err.message || 'Failed to load watchlist data');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function fetchIndexesAndNews() {
    try {
      const idxRes = await getIndexes();
      setIndexesData(idxRes);

      const symbols = (data.stocks || []).map(s => s.symbol);
      const newsRes = await getNewsStream(symbols);
      setNewsData(newsRes);
    } catch (err) {
      console.warn('[Dashboard] Live index/news fetch error:', err.message);
    }
  }

  // ── Multi-Watchlist Handlers ───────────────────────────────────────────────

  async function handleCreateWatchlist(name) {
    try {
      const res = await createWatchlist({ name });
      await loadWatchlists();
      if (res.watchlist) setActiveWlId(res.watchlist.id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create watchlist');
    }
  }

  async function handleRenameWatchlist(id, name) {
    try {
      await updateWatchlist(id, { name });
      await loadWatchlists();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to rename watchlist');
    }
  }

  async function handleSetDefaultWatchlist(id) {
    try {
      await updateWatchlist(id, { isDefault: true });
      await loadWatchlists();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to set default watchlist');
    }
  }

  async function handleDeleteWatchlist(id) {
    try {
      await deleteWatchlist(id);
      await loadWatchlists();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete watchlist');
    }
  }

  async function handleAddStock(stockPayload) {
    console.log('[App.jsx handleAddStock] Initiated with payload:', stockPayload, 'activeWlId:', activeWlId);
    setActionLoading(true);
    try {
      const targetWlId = activeWlId || (watchlists.length > 0 ? watchlists[0].id : null);
      console.log('[App.jsx handleAddStock] Resolved targetWlId:', targetWlId);
      const res = await addStock({ ...stockPayload, watchlistId: targetWlId });
      console.log('[App.jsx handleAddStock] addStock returned success:', res);
      await loadWatchlists();
      await fetchAttentionData(targetWlId);
    } catch (err) {
      console.error('[App.jsx handleAddStock] Error caught while adding stock:', err, 'Response:', err.response?.data);
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message || 'Failed to add stock.';
      alert(`[Stock Add Error] ${errMsg}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveStock(watchlistStockId) {
    if (!window.confirm('Remove this stock from watchlist?')) return;
    setActionLoading(true);
    try {
      await removeStock(watchlistStockId);
      await fetchAttentionData(activeWlId);
      await loadWatchlists();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove stock.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcknowledge(watchlistStockId) {
    if (!watchlistStockId) return;
    try {
      await acknowledgeStock(watchlistStockId);
    } catch (err) {
      console.warn('[Dashboard] Acknowledge failed:', err.message);
    }
  }

  async function handleMarkSeen(watchlistStockId) {
    if (!watchlistStockId) return;
    setActionLoading(true);
    try {
      await markAsSeen(watchlistStockId);
      await fetchAttentionData(activeWlId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as seen.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGetAI(summary) {
    return getAIExplanation(summary);
  }

  function handleToggleColumn(colId) {
    setVisibleColumns(prev =>
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  }

  function handleResetDefaultColumns() {
    setVisibleColumns(DEFAULT_COLS);
  }

  const existingSymbols = (data.stocks || []).map(s => s.symbol);

  if (authChecking) {
    return (
      <div className="app-shell flex-center" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Loading ShareBazaar...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={navTab}
        onSelectTab={setNavTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Workspace Content */}
      <div className="app-container">
        {navTab === 'home' && (
          <HomeTab
            indexes={indexesData}
            stocks={data.stocks}
            newsData={newsData}
            onAcknowledge={handleAcknowledge}
            onMarkSeen={handleMarkSeen}
            onGetAI={handleGetAI}
            actionLoading={actionLoading}
            onNavigateNews={() => setNavTab('news')}
          />
        )}

        {navTab === 'news' && <NewsFeed newsData={newsData} stocks={data.stocks} />}

        {navTab === 'watchlist' && (
          <WatchlistTab
            indexes={indexesData}
            stocks={data.stocks}
            watchlists={watchlists}
            activeWlId={activeWlId}
            onSelectWatchlist={setActiveWlId}
            onCreateWatchlist={handleCreateWatchlist}
            onRenameWatchlist={handleRenameWatchlist}
            onSetDefaultWatchlist={handleSetDefaultWatchlist}
            onDeleteWatchlist={handleDeleteWatchlist}
            onAcknowledge={handleAcknowledge}
            onMarkSeen={handleMarkSeen}
            onGetAI={handleGetAI}
            onOpenAddModal={() => setUniverseOpen(true)}
            onOpenColModal={() => setColModalOpen(true)}
            visibleColumns={visibleColumns}
            onRemoveStock={handleRemoveStock}
            onAddStock={handleAddStock}
            onSelectStockForChart={setSelectedChartStock}
            existingSymbols={existingSymbols}
            actionLoading={actionLoading}
            error={error}
            fetchAttentionData={fetchAttentionData}
          />
        )}
      </div>

      {/* Modals */}
      <PulseUniverseModal
        isOpen={isUniverseOpen}
        onClose={() => setUniverseOpen(false)}
        onAddStock={handleAddStock}
        existingSymbols={existingSymbols}
      />

      <ColumnCustomizerModal
        isOpen={isColModalOpen}
        onClose={() => setColModalOpen(false)}
        visibleColumns={visibleColumns}
        onToggleColumn={handleToggleColumn}
        onResetDefault={handleResetDefaultColumns}
      />

      <StockChartModal
        stock={selectedChartStock}
        isOpen={!!selectedChartStock}
        onClose={() => setSelectedChartStock(null)}
      />

      <footer className="app-footer">
        <p>ShareBazaar — Real-Time Market Intelligence & Baseline Analytics Engine</p>
      </footer>
    </div>
  );
}
