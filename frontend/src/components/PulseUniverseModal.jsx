import React, { useState, useEffect } from 'react';
import { getPulseUniverse } from '../api';

export default function PulseUniverseModal({ isOpen, onClose, onAddStock, existingSymbols = [] }) {
  const [stocks,    setStocks]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [group,     setGroup]     = useState('ALL');
  const [search,    setSearch]    = useState('');
  const [addingSym, setAddingSym] = useState(null);

  const existingSet = new Set(existingSymbols.map(s => s.toUpperCase()));

  useEffect(() => {
    if (isOpen) {
      fetchUniverse();
    }
  }, [isOpen, group, search]);

  async function fetchUniverse() {
    setLoading(true);
    try {
      const res = await getPulseUniverse({ group, search });
      setStocks(res.stocks || []);
    } catch (err) {
      console.error('[PulseUniverse] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(stock) {
    console.log('[PulseUniverseModal handleAdd] User clicked add for stock:', stock);
    setAddingSym(stock.symbol);
    try {
      await onAddStock({
        symbol: stock.symbol,
        displayName: stock.display_name,
        exchange: stock.exchange || 'NSE',
      });
      console.log('[PulseUniverseModal handleAdd] Successfully executed onAddStock for:', stock.symbol);
    } catch (err) {
      console.error('[PulseUniverseModal handleAdd] Error adding stock:', stock.symbol, err);
    } finally {
      setAddingSym(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content universe-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">🌐 100-Stock Pulse Universe</h3>
            <p className="modal-sub">Browse and add benchmark stocks from NIFTY 50 & NIFTY NEXT 50.</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Controls Bar */}
        <div className="universe-controls">
          <input
            className="input universe-search"
            placeholder="🔍 Search 100 stocks (e.g. RELIANCE, TATAMOTORS, ZOMATO)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <div className="universe-filter-tabs">
            {['ALL', 'NIFTY 50', 'NIFTY NEXT 50'].map(g => (
              <button
                key={g}
                className={`filter-btn ${group === g ? 'filter-btn--active' : ''}`}
                onClick={() => setGroup(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Stock List */}
        <div className="universe-list">
          {loading ? (
            <div className="loading-state">
              <span className="spinner" /> Loading Pulse Universe…
            </div>
          ) : stocks.length === 0 ? (
            <div className="empty-state">No matching stocks found.</div>
          ) : (
            <div className="universe-grid">
              {stocks.map(s => {
                const isAdded = existingSet.has(s.symbol.toUpperCase());
                const isAdding = addingSym === s.symbol;

                return (
                  <div key={s.symbol} className={`universe-card ${isAdded ? 'universe-card--added' : ''}`}>
                    <div className="universe-card__info">
                      <div className="universe-card__header">
                        <span className="universe-card__symbol">{s.symbol}</span>
                        <span className={`group-badge ${s.index_group === 'NIFTY 50' ? 'group-badge--n50' : 'group-badge--next50'}`}>
                          {s.index_group}
                        </span>
                      </div>
                      <span className="universe-card__name">{s.display_name}</span>
                    </div>

                    <button
                      className={`btn btn--sm ${isAdded ? 'btn--ghost' : 'btn--primary'}`}
                      onClick={() => !isAdded && handleAdd(s)}
                      disabled={isAdded || isAdding}
                    >
                      {isAdded ? '✓ Added' : isAdding ? 'Adding…' : '+ Add'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
