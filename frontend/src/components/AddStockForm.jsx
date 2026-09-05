import React, { useState } from 'react';

// Popular Indian stocks for quick-add chips
const POPULAR = [
  { symbol: 'RELIANCE',   displayName: 'Reliance Industries',       exchange: 'BSE' },
  { symbol: 'TCS',        displayName: 'Tata Consultancy Services',  exchange: 'BSE' },
  { symbol: 'INFY',       displayName: 'Infosys',                    exchange: 'BSE' },
  { symbol: 'HDFCBANK',   displayName: 'HDFC Bank',                  exchange: 'BSE' },
  { symbol: 'ICICIBANK',  displayName: 'ICICI Bank',                 exchange: 'BSE' },
  { symbol: 'WIPRO',      displayName: 'Wipro',                      exchange: 'BSE' },
  { symbol: 'BAJFINANCE', displayName: 'Bajaj Finance',              exchange: 'BSE' },
  { symbol: 'MARUTI',     displayName: 'Maruti Suzuki',              exchange: 'BSE' },
  { symbol: 'TATAMOTORS', displayName: 'Tata Motors',                exchange: 'BSE' },
  { symbol: 'SUNPHARMA',  displayName: 'Sun Pharmaceutical',         exchange: 'BSE' },
];

export default function AddStockForm({ onAdd, existingSymbols = [], loading }) {
  const [symbol,      setSymbol]      = useState('');
  const [displayName, setDisplayName] = useState('');
  const [exchange,    setExchange]    = useState('BSE');
  const [error,       setError]       = useState('');

  const existingSet = new Set(existingSymbols.map(s => s.toUpperCase()));

  function handleSubmit(e) {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    if (!sym || !displayName.trim()) {
      setError('Symbol and company name are required.');
      return;
    }
    setError('');
    onAdd({ symbol: sym, displayName: displayName.trim(), exchange });
    setSymbol('');
    setDisplayName('');
  }

  function handleQuickAdd(stock) {
    if (existingSet.has(stock.symbol)) return;
    onAdd(stock);
  }

  return (
    <div className="add-stock-form">
      <h3 className="add-stock-form__title">Add Stock</h3>

      {/* Quick-add chips */}
      <div className="quick-add">
        <p className="quick-add__label">Popular stocks</p>
        <div className="quick-add__chips">
          {POPULAR.map(s => (
            <button
              key={s.symbol}
              className={`chip ${existingSet.has(s.symbol) ? 'chip--added' : ''}`}
              onClick={() => handleQuickAdd(s)}
              disabled={existingSet.has(s.symbol) || loading}
              title={s.displayName}
            >
              {s.symbol}
              {existingSet.has(s.symbol) && ' ✓'}
            </button>
          ))}
        </div>
      </div>

      {/* Manual entry */}
      <form onSubmit={handleSubmit} className="add-stock-form__manual">
        <div className="form-row">
          <input
            className="input"
            placeholder="Symbol (e.g. NESTLEIND)"
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            disabled={loading}
          />
          <select
            className="input input--select"
            value={exchange}
            onChange={e => setExchange(e.target.value)}
            disabled={loading}
          >
            <option value="BSE">BSE</option>
            <option value="NSE">NSE</option>
          </select>
        </div>
        <input
          className="input"
          placeholder="Company name (e.g. Nestle India)"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          disabled={loading}
          style={{ marginTop: 8 }}
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={loading} style={{ marginTop: 10, width: '100%' }}>
          {loading ? 'Adding…' : '+ Add to Watchlist'}
        </button>
      </form>
    </div>
  );
}
