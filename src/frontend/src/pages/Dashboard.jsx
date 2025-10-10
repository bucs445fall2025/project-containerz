// src/frontend/src/pages/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../context/AuthContext.jsx';
import { createLinkToken, fetchAccounts, setAccessToken } from '../api/plaid.js';
import { sendVerificationCode, verifyVerificationCode } from '../api/auth.js';

export default function DashboardPage() {
  const { user, token, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [linkToken, setLinkToken] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [linkWorking, setLinkWorking] = useState(false);
  const isVerified = Boolean(user?.verified);
  const [code, setCode] = useState('');
  const [verificationStatus, setVerificationStatus] = useState({ sending: false, verifying: false, error: '', success: '' });
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [hasRequestedCode, setHasRequestedCode] = useState(false);
  const [error, setError] = useState(null);

  const handleSendCode = async () => {
    setVerificationOpen(true);
    setVerificationStatus((prev) => ({ ...prev, sending: true, error: '', success: '' }));
    try {
      await sendVerificationCode(token, user.email);
      setHasRequestedCode(true);
      setVerificationStatus((prev) => ({ ...prev, success: 'Code sent! Check your inbox.' }));
    } catch (error) {
      setVerificationStatus((prev) => ({ ...prev, error: error.message || 'Unable to send code.' }));
    } finally {
      setVerificationStatus((prev) => ({ ...prev, sending: false }));
    }
  };
  
  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setVerificationStatus((prev) => ({ ...prev, verifying: true, error: '', success: '' }));
    try {
      await verifyVerificationCode(token, { email: user.email, code });
      setVerificationStatus({ sending: false, verifying: false, error: '', success: 'Verified! Updating your account…' });
      setCode('');
      await refreshUser();
      navigate(0);
    } catch (error) {
      setVerificationStatus((prev) => ({ ...prev, error: error.message || 'Invalid or expired code.' }));
    } finally {
      setVerificationStatus((prev) => ({ ...prev, verifying: false }));
    }
  };
  
  const handleStartVerification = async () => {
    if (!verificationOpen) {
      setVerificationOpen(true);
    }
    if (!hasRequestedCode && !verificationStatus.sending) {
      await handleSendCode();
    }
  };

  const handleHideVerification = () => {
    setVerificationOpen(false);
  };

  const handleToggleVerification = async () => {
    if (verificationOpen) {
      handleHideVerification();
      return;
    }
    await handleStartVerification();
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const loadAccounts = useCallback(async () => {
    if (!token) {
      return;
    }
    setAccountsLoading(true);
    try {
      const response = await fetchAccounts(token);
      setAccounts(response.accounts ?? []);
      setError(null);
    } catch (err) {
      console.error('Unable to load accounts', err);
      setError(err.message ?? 'Unable to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    async function bootstrapLink() {
      try {
        const response = await createLinkToken(token);
        if (!cancelled) {
          setLinkToken(response.link_token);
        }
      } catch (err) {
        console.error('Unable to create link token', err);
        if (!cancelled) {
          setError(err.message ?? 'Unable to initialize Plaid Link');
        }
      }
    }
    bootstrapLink();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const plaidConfig = useMemo(
    () => ({
      token: linkToken,
      onSuccess: async (publicToken) => {
        setLinkWorking(true);
        try {
          await setAccessToken(token, publicToken);
          await loadAccounts();
          setError(null);
          const response = await createLinkToken(token);
          setLinkToken(response.link_token);
        } catch (err) {
          console.error('Unable to set Plaid access token', err);
          setError(err.message ?? 'Unable to save Plaid access token');
        } finally {
          setLinkWorking(false);
        }
      },
      onExit: (exitError) => {
        if (exitError) {
          setError(exitError.display_message || exitError.error_message || 'Plaid Link exited');
        }
      }
    }),
    [linkToken, loadAccounts, token]
  );

  const { open, ready, error: linkError } = usePlaidLink(plaidConfig);

  useEffect(() => {
    if (linkError) {
      console.error('Plaid Link error', linkError);
      setError(linkError.message ?? 'Plaid Link failed to load');
    }
  }, [linkError]);

  const handleConnectBank = () => {
    if (!ready || !linkToken) {
      return;
    }
    open();
  };

  const hasAccounts = accounts.length > 0;

  const getCurrencyCode = (account) =>
    account?.balances?.iso_currency_code || account?.balances?.unofficial_currency_code || 'USD';

  const formatBalance = (value, account) => {
    if (value === null || value === undefined) {
      return '—';
    }
    const currencyCode = getCurrencyCode(account);
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      }).format(value);
    } catch (err) {
      return `$${value.toLocaleString()}`;
    }
  };

  const getInstitutionName = (account) =>
    account?.institution?.name || account?.bank_name || account?.bankName || account?.name;

  const getAccountTitle = (account) => account?.official_name || account?.name || 'Account';

  const getLogoSrc = (account) =>
    account?.institution?.logo ||
    account?.institution?.logo_url ||
    account?.logo?.url ||
    account?.logo_url ||
    account?.logo;

  const getLogoInitial = (account) => {
    const label = getInstitutionName(account) || getAccountTitle(account);
    return label?.charAt(0)?.toUpperCase() || 'B';
  };

  const formatAccountType = (account) => {
    const raw = account?.subtype || account?.type;
    if (!raw) {
      return '';
    }
    return raw
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Hello {user?.name ?? 'there'}!</h1>
          <p className="dashboard-subtitle">This is your dashboard home.</p>
        </div>
        <button className="auth-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>
      {!isVerified && (
        <>
          <section className="verification-banner">
            <h2>Verify your email to unlock everything</h2>
            <p>We’ll need to confirm your email before you can connect bank accounts.</p>
            <div className="verification-banner-actions">
              <button
                className="auth-button"
                type="button"
                onClick={handleToggleVerification}
                disabled={verificationStatus.sending}
              >
                {verificationOpen ? 'Hide verification' : 'Verify now'}
              </button>
            </div>
          </section>
          {verificationOpen && (
            <section className="verification-card">
              <h3>Enter your 6-digit verification code</h3>
              <p>We sent a code to <strong>{user?.email}</strong>. Didn&apos;t get it?</p>
              <button type="button" onClick={handleSendCode} disabled={verificationStatus.sending}>
                {verificationStatus.sending ? 'Sending…' : hasRequestedCode ? 'Resend code' : 'Send code'}
              </button>
              <form onSubmit={handleVerifyCode}>
                <label htmlFor="verification-code-input">Verification code</label>
                <input
                  id="verification-code-input"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  placeholder="Enter 6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <button type="submit" disabled={verificationStatus.verifying}>
                  {verificationStatus.verifying ? 'Verifying…' : 'Verify'}
                </button>
              </form>
              {verificationStatus.error && <p className="error">{verificationStatus.error}</p>}
              {verificationStatus.success && <p className="success">{verificationStatus.success}</p>}
            </section>
          )}
        </>
      )}
      <section className="dashboard-body">
        <div className="dashboard-actions">
          <button
            className="auth-button"
            type="button"
            onClick={handleConnectBank}
            disabled={!ready || linkWorking || !isVerified}
          >
            {isVerified ? 'Connect a bank' : 'Verify account to connect'}
          </button>
          <button
            className="auth-button"
            type="button"
            onClick={loadAccounts}
            disabled={accountsLoading}
          >
            {accountsLoading ? 'Refreshing…' : 'Refresh balances'}
          </button>
        </div>

        {error ? <p className="dashboard-error">{error}</p> : null}

        {accountsLoading ? (
          <p>Loading balances…</p>
        ) : hasAccounts ? (
          <div className="account-grid">
            {accounts.map((account) => {
              const institutionName = getInstitutionName(account);
              const accountTitle = getAccountTitle(account);
              const mask = account.mask ? `•••• ${account.mask}` : '';
              const accountType = formatAccountType(account);
              const logoSrc = getLogoSrc(account);

              return (
                <article className="account-card" key={account.account_id}>
                  <div className="account-card-header">
                    <div className="account-logo">
                      {logoSrc ? (
                        <img src={logoSrc} alt={`${institutionName || accountTitle} logo`} />
                      ) : (
                        <span>{getLogoInitial(account)}</span>
                      )}
                    </div>
                    <div className="account-card-titles">
                      <h3>{accountTitle}</h3>
                      <p>
                        {institutionName || 'Linked account'}
                        {mask ? ` · ${mask}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="account-card-body">
                    <div>
                      <span className="account-metric-label">Available</span>
                      <span className="account-metric-value">
                        {formatBalance(account.balances?.available, account)}
                      </span>
                    </div>
                    <div>
                      <span className="account-metric-label">Current</span>
                      <span className="account-metric-value">
                        {formatBalance(account.balances?.current, account)}
                      </span>
                    </div>
                  </div>

                  {accountType ? (
                    <div className="account-card-footer">
                      <span className="account-tag">{accountType}</span>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p>Your account balances will be shown here after you connect a bank.</p>
        )}
      </section>
    </div>
  );
}
