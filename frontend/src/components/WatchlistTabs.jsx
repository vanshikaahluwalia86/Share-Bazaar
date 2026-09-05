import React, { useState } from 'react';

export default function WatchlistTabs({
  watchlists = [],
  activeWatchlistId,
  activeId,
  onSelectWatchlist,
  onSelect,
  onCreateWatchlist,
  onCreate,
  onRenameWatchlist,
  onRename,
  onSetDefaultWatchlist,
  onSetDefault,
  onDeleteWatchlist,
  onDelete,
}) {
  const currentActiveId = activeWatchlistId ?? activeId;
  const handleSelect = onSelectWatchlist || onSelect;
  const handleCreate = onCreateWatchlist || onCreate;
  const handleRename = onRenameWatchlist || onRename;
  const handleSetDefault = onSetDefaultWatchlist || onSetDefault;
  const handleDelete = onDeleteWatchlist || onDelete;

  const [isCreating, setCreating] = useState(false);
  const [newName,    setNewName]   = useState('');
  const [editingId,  setEditingId] = useState(null);
  const [editName,   setEditName]  = useState('');

  function handleCreateSubmit(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    if (handleCreate) handleCreate(newName.trim());
    setNewName('');
    setCreating(false);
  }

  function handleRenameSubmit(id) {
    if (!editName.trim()) return;
    if (handleRename) handleRename(id, editName.trim());
    setEditingId(null);
  }

  return (
    <div className="watchlist-tabs-bar">
      <div className="watchlist-tabs">
        {watchlists.map(wl => {
          const isActive = wl.id === currentActiveId;
          const isEditing = wl.id === editingId;

          return (
            <div
              key={wl.id}
              className={`tab-item ${isActive ? 'tab-item--active' : ''}`}
              onClick={() => !isEditing && handleSelect && handleSelect(wl.id)}
            >
              {isEditing ? (
                <input
                  className="tab-item__input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onBlur={() => handleRenameSubmit(wl.id)}
                  onKeyDown={e => e.key === 'Enter' && handleRenameSubmit(wl.id)}
                  autoFocus
                />
              ) : (
                <>
                  <span className="tab-item__name">
                    {wl.name} {wl.is_default && <span className="default-star" title="Default Watchlist">⭐</span>}
                  </span>
                  <span className="tab-item__count">({wl.stock_count || 0})</span>

                  {isActive && (
                    <div className="tab-item__menu">
                      <button
                        className="tab-menu-btn"
                        title="Rename watchlist"
                        onClick={(e) => { e.stopPropagation(); setEditingId(wl.id); setEditName(wl.name); }}
                      >
                        ✏️
                      </button>
                      {!wl.is_default && (
                        <button
                          className="tab-menu-btn"
                          title="Set as Default Watchlist"
                          onClick={(e) => { e.stopPropagation(); handleSetDefault && handleSetDefault(wl.id); }}
                        >
                          ⭐
                        </button>
                      )}
                      {watchlists.length > 1 && (
                        <button
                          className="tab-menu-btn tab-menu-btn--delete"
                          title="Delete Watchlist"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${wl.name}" watchlist?`)) {
                              handleDelete && handleDelete(wl.id);
                            }
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}

        {isCreating ? (
          <form onSubmit={handleCreateSubmit} className="tab-create-form">
            <input
              className="input input--sm"
              placeholder="Watchlist Name (e.g. IT Stocks, Bluechips)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              autoFocus
            />
            <button className="btn btn--sm btn--primary" type="submit">Save</button>
            <button className="btn btn--sm btn--ghost" type="button" onClick={() => setCreating(false)}>×</button>
          </form>
        ) : (
          <button className="btn btn--sm btn--ghost tab-add-btn" onClick={() => setCreating(true)}>
            ➕ New Watchlist
          </button>
        )}
      </div>
    </div>
  );
}
