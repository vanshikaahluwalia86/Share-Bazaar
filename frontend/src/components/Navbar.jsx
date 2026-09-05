import React, { useState } from 'react';

export default function Navbar({ activeTab, onSelectTab, currentUser, onLogout, theme = 'light', onToggleTheme }) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = currentUser?.display_name || currentUser?.username || 'Demo User';
  const email = currentUser?.email || 'demo.user@sharebazaar.in';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <nav className="top-navbar">
      <div className="navbar-container">
        {/* Left: Brand Logo & Name */}
        <div className="navbar-brand" onClick={() => onSelectTab('home')}>
          <span className="brand-icon">📈</span>
          <span className="brand-text">ShareBazaar</span>
        </div>

        {/* Center: Navigation Tabs */}
        <div className="navbar-tabs">
          <button
            className={`nav-tab ${activeTab === 'home' ? 'nav-tab--active' : ''}`}
            onClick={() => onSelectTab('home')}
          >
            Home
          </button>
          <button
            className={`nav-tab ${activeTab === 'watchlist' ? 'nav-tab--active' : ''}`}
            onClick={() => onSelectTab('watchlist')}
          >
            My Watchlist
          </button>
          <button
            className={`nav-tab ${activeTab === 'news' ? 'nav-tab--active' : ''}`}
            onClick={() => onSelectTab('news')}
          >
            Market News
          </button>
        </div>

        {/* Right: Actions & User Menu */}
        <div className="navbar-right-actions">
          {/* Theme Toggle Button */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
            <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {/* User Account Icon */}
          <div className="navbar-user">
            <button
              className="user-profile-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title="User Account"
            >
              <div className="avatar-circle">{initials}</div>
              <span className="user-name">{displayName}</span>
              <span className="chevron-down">▾</span>
            </button>

          {showUserMenu && (
            <div className="user-dropdown-menu">
              <div className="user-info-header">
                <strong>{displayName}</strong>
                <span className="user-email">{email}</span>
              </div>
              <hr className="menu-divider" />
              <button className="dropdown-item" onClick={() => { alert('Account Settings'); setShowUserMenu(false); }}>
                ⚙️ Account Settings
              </button>
              <button className="dropdown-item" onClick={() => { alert('API & Integration Config'); setShowUserMenu(false); }}>
                🔌 API & Integration Config
              </button>
              <hr className="menu-divider" />
              <button
                className="dropdown-item text-danger"
                onClick={() => {
                  setShowUserMenu(false);
                  if (onLogout) onLogout();
                }}
              >
                🚪 Logout
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </nav>
  );
}
