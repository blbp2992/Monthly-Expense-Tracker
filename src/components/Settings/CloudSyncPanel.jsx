import React, { useState } from 'react';
import { useExpense } from '../../context/ExpenseContext';
import { Cloud, LogIn, LogOut, UserPlus, AlertCircle } from 'lucide-react';

export const SYNC_STATUS_LABELS = {
  'not-configured': { label: 'Not set up', color: 'var(--text-muted)' },
  loading: { label: 'Loading…', color: 'var(--text-muted)' },
  'signed-out': { label: 'Signed out', color: 'var(--text-muted)' },
  syncing: { label: 'Syncing…', color: 'var(--primary)' },
  synced: { label: 'Synced', color: 'var(--income-green)' },
  offline: { label: 'Offline — changes will sync later', color: 'var(--warning-amber)' },
  error: { label: 'Sync error', color: 'var(--expense-red)' }
};

export const CloudSyncPanel = () => {
  const {
    cloudConfigured,
    cloudUser,
    cloudStatus,
    cloudError,
    cloudSignIn,
    cloudSignUp,
    cloudResetPassword,
    cloudSignOut,
    addToast
  } = useExpense();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const run = async (action, successMsg) => {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      if (successMsg) addToast(successMsg);
      setPassword('');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const status = SYNC_STATUS_LABELS[cloudStatus] || SYNC_STATUS_LABELS.loading;

  return (
    <div className="glass-panel">
      <div className="panel-header">
        <div className="panel-title">
          <Cloud size={20} color="var(--primary)" />
          <span>Cloud Sync (Mac ↔ iPhone)</span>
        </div>
        {cloudUser && (
          <span className="badge-tag" style={{ color: status.color, fontWeight: 600 }}>
            {status.label}
          </span>
        )}
      </div>

      {!cloudConfigured && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Cloud sync isn't set up for this app yet. Until it is, data stays in this browser only.
        </p>
      )}

      {cloudConfigured && cloudStatus === 'loading' && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Checking sign-in…</p>
      )}

      {cloudConfigured && cloudUser && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Signed in as <strong style={{ color: 'var(--text-main)' }}>{cloudUser.email}</strong>. Transactions,
            categories, budgets, recurring bills and remembered item categories sync across every device
            signed in to this account. Your Gemini API key stays on each device.
          </p>
          {cloudStatus === 'error' && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--expense-red)' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>
                {cloudError === 'permission-denied'
                  ? 'Firestore security rules blocked access. Check the rules in the Firebase console.'
                  : `Sync failed: ${cloudError}`}
              </span>
            </div>
          )}
          <div>
            <button
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => run(cloudSignOut, 'Signed out — data on this device stays available offline')}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {cloudConfigured && cloudStatus === 'signed-out' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(() => cloudSignIn(email.trim(), password), 'Signed in — syncing your data');
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sign in with the same account on your Mac and iPhone to keep them in sync. On first sign-in,
            data already on this device is added to your account.
          </p>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          </div>

          {formError && (
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--expense-red)' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => {
                if (!email.trim() || password.length < 6) {
                  setFormError('Enter an email and a password of at least 6 characters.');
                  return;
                }
                run(() => cloudSignUp(email.trim(), password), 'Account created — syncing your data');
              }}
            >
              <UserPlus size={16} />
              <span>Create Account</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              style={{ fontSize: '0.82rem' }}
              onClick={() => {
                if (!email.trim()) {
                  setFormError('Enter your email first, then tap Forgot password.');
                  return;
                }
                run(() => cloudResetPassword(email.trim()), `Password reset email sent to ${email.trim()}`);
              }}
            >
              Forgot password?
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
