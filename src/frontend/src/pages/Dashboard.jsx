// src/frontend/src/pages/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../context/AuthContext.jsx';
import { createLinkToken, fetchAccounts, setAccessToken } from '../api/plaid.js';
import { sendVerificationCode, verifyVerificationCode } from '../api/auth.js';

const DASHBOARD_TABS = [
  { key: 'balances', label: 'Account Balances' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'stocks', label: 'Stocks' }
];

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
  const [activeTab, setActiveTab] = useState(DASHBOARD_TABS[0].key);
  const tabDefinitions = useMemo(
    () =>
      DASHBOARD_TABS.map((tab) => ({
        ...tab,
        buttonId: `dashboard-tab-${tab.key}`,
        panelId: `dashboard-panel-${tab.key}`
      })),
    []
  );
  const handleTabKeyDown = useCallback(
    (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        return;
      }
      event.preventDefault();
      const currentIndex = tabDefinitions.findIndex((tab) => tab.key === activeTab);
      if (currentIndex === -1) {
        return;
      }
      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % tabDefinitions.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + tabDefinitions.length) % tabDefinitions.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabDefinitions.length - 1;
      }
      const nextTab = tabDefinitions[nextIndex];
      if (nextTab) {
        setActiveTab(nextTab.key);
        const nextButton =
          typeof document !== 'undefined' ? document.getElementById(nextTab.buttonId) : null;
        if (nextButton) {
          nextButton.focus();
        }
      }
    },
    [activeTab, tabDefinitions]
  );

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
        <section
          className={`verification-container${verificationOpen ? ' is-open' : ''}`}
          aria-live="polite"
          aria-label="Account verification"
        >
          <div className="verification-banner">
            <div className="verification-banner-icon" aria-hidden="true">
              ✓
            </div>
            <div className="verification-banner-copy">
              <h2>Verify your email to unlock everything</h2>
              <p>Confirming your email lets you connect bank accounts and start tracking finances.</p>
            </div>
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
          </div>
          {verificationOpen && (
            <div className="verification-card" role="region" aria-labelledby="verification-heading">
              <div className="verification-card-header">
                <h3 id="verification-heading">Enter your 6-digit code</h3>
                <p>
                  We sent a code to <strong>{user?.email}</strong>
                </p>
              </div>
              <div className="verification-card-actions">
                <button
                  className="verification-resend"
                  type="button"
                  onClick={handleSendCode}
                  disabled={verificationStatus.sending}
                >
                  {verificationStatus.sending ? 'Sending…' : hasRequestedCode ? 'Resend code' : 'Send code'}
                </button>
              </div>
              <form className="verification-form" onSubmit={handleVerifyCode}>
                <label className="verification-label" htmlFor="verification-code-input">
                  Verification code
                </label>
                <input
                  className="verification-input"
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
                <button className="auth-button" type="submit" disabled={verificationStatus.verifying}>
                  {verificationStatus.verifying ? 'Verifying…' : 'Verify email'}
                </button>
              </form>
              <div className="verification-status">
                {verificationStatus.error ? (
                  <p className="verification-status-message error">{verificationStatus.error}</p>
                ) : null}
                {verificationStatus.success ? (
                  <p className="verification-status-message success">{verificationStatus.success}</p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      )}
      <section className="dashboard-body">
        <nav className="dashboard-tabs" aria-label="Dashboard sections" role="tablist">
          {tabDefinitions.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={tab.buttonId}
                aria-selected={isActive}
                aria-controls={tab.panelId}
                className={`dashboard-tab${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={handleTabKeyDown}
                tabIndex={isActive ? 0 : -1}
              >
                <span className="dashboard-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="dashboard-tab-content">
          {activeTab === 'balances' ? (
            <section
              id="dashboard-panel-balances"
              role="tabpanel"
              aria-labelledby="dashboard-tab-balances"
              className="dashboard-panel"
            >
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
          ) : null}

          {activeTab === 'transactions' ? (
            <section
              id="dashboard-panel-transactions"
              role="tabpanel"
              aria-labelledby="dashboard-tab-transactions"
              className="dashboard-panel dashboard-placeholder"
            >
              <h3>Transactions</h3>
              <p>Once available, your recent transactions will be shown here.</p>
              <p>Connect a bank account to start pulling transaction history.</p>
            </section>
          ) : null}

          {activeTab === 'stocks' ? (
            <section
              id="dashboard-panel-stocks"
              role="tabpanel"
              aria-labelledby="dashboard-tab-stocks"
              className="dashboard-panel dashboard-placeholder"
            >
              <h3>Stocks</h3>
              <p>Track your stocks and investments in this tab.</p>
              <p>We&apos;ll surface holdings after you link a brokerage account.</p>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
