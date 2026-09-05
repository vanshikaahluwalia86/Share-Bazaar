import React, { useState } from 'react';
import { register, verifyOtp, resendOtp, login } from '../api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage({ onAuthSuccess, theme, onToggleTheme }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  
  // Form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  
  // OTP flow state
  const [otpStep, setOtpStep] = useState(false); // false = enter details, true = enter OTP
  const [otpValue, setOtpValue] = useState('');
  const [devOtpHint, setDevOtpHint] = useState(null);
  
  // Feedback states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Switch tabs
  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccess('');
    setOtpStep(false);
    setOtpValue('');
    setDevOtpHint(null);
  };

  // ── Handle Login ─────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const email = loginEmail.trim();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!loginPassword) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    try {
      const data = await login({ email, password: loginPassword });
      localStorage.setItem('smw_auth_token', data.token);
      setSuccess('Login successful! Redirecting...');
      if (onAuthSuccess) {
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      const errRes = err.response?.data;
      if (errRes?.code === 'EMAIL_NOT_VERIFIED') {
        setError('Email verification required. Please verify your email.');
        // Switch to OTP step for this email
        setRegEmail(email);
        setTab('register');
        setOtpStep(true);
        // Request a fresh OTP
        try {
          const resendData = await resendOtp(email);
          if (resendData.devOtp) setDevOtpHint(resendData.devOtp);
        } catch {
          // ignore resend error here
        }
      } else {
        setError(errRes?.error || 'Invalid email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Register (Step 1: Request OTP) ────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const username = regUsername.trim();
    const email = regEmail.trim();

    if (!username) {
      setError('Username is required.');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const data = await register({
        username,
        email,
        password: regPassword,
      });
      setOtpStep(true);
      setSuccess(data.message || 'OTP sent! Please check your email.');
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Verify OTP (Step 2: Complete Registration) ────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const otp = otpValue.trim();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOtp({
        email: regEmail.trim(),
        otp,
      });
      localStorage.setItem('smw_auth_token', data.token);
      setSuccess('Account verified and created successfully! Redirecting...');
      if (onAuthSuccess) {
        onAuthSuccess(data.user, data.token);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Resend OTP ────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data = await resendOtp(regEmail.trim());
      setSuccess('New OTP generated successfully.');
      if (data.devOtp) {
        setDevOtpHint(data.devOtp);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {onToggleTheme && (
        <button
          type="button"
          className="theme-toggle-btn auth-theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      )}
      <div className="auth-card">
        {/* Branding */}
        <div className="auth-header">
          <div className="auth-logo">
            <span className="auth-logo-icon">📈</span>
            <span className="auth-brand-name">ShareBazaar</span>
          </div>
          <h1 className="auth-welcome-title">Welcome to ShareBazaar</h1>
          <p className="auth-subtitle">
            Your market. Your watchlist. Your attention.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => switchTab('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => switchTab('register')}
          >
            Register
          </button>
        </div>

        {/* Messages */}
        {error && <div className="alert-box alert-error">{error}</div>}
        {success && <div className="alert-box alert-success">{success}</div>}

        {/* ── LOGIN VIEW ──────────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                className="input"
                placeholder="name@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login to Dashboard'}
            </button>

            <div className="auth-footer-toggle">
              Don't have an account?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => switchTab('register')}
              >
                Register
              </button>
            </div>
          </form>
        )}

        {/* ── REGISTER VIEW ───────────────────────────────────────────────────── */}
        {tab === 'register' && !otpStep && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                className="input"
                placeholder="e.g. rahul_trader"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                className="input"
                placeholder="name@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="input"
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>

            <div className="auth-footer-toggle">
              Already have an account?{' '}
              <button
                type="button"
                className="btn-link"
                onClick={() => switchTab('login')}
              >
                Login
              </button>
            </div>
          </form>
        )}

        {/* ── OTP VERIFICATION STEP ───────────────────────────────────────────── */}
        {tab === 'register' && otpStep && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="otp-info-banner">
              <p>
                Verification code sent to <strong>{regEmail}</strong>
              </p>
            </div>

            {/* Development Mode OTP Helper */}
            {devOtpHint && (
              <div className="dev-otp-box">
                <div className="dev-otp-title">
                  <span>🛠️</span> <strong>Dev Mode OTP</strong>
                </div>
                <div className="dev-otp-body">
                  <code>{devOtpHint}</code>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => setOtpValue(devOtpHint)}
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="reg-otp">Enter 6-digit OTP</label>
              <input
                id="reg-otp"
                type="text"
                className="input otp-input"
                placeholder="123456"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary auth-submit-btn"
              disabled={loading || otpValue.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify OTP & Complete Registration'}
            </button>

            <div className="otp-actions-row">
              <button
                type="button"
                className="btn-link"
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend OTP
              </button>
              <span className="divider">•</span>
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setOtpStep(false);
                  setOtpValue('');
                  setDevOtpHint(null);
                }}
                disabled={loading}
              >
                Edit Details
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
