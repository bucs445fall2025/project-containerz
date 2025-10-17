// src/frontend/src/pages/Dashboard.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../context/AuthContext.jsx';
import { createLinkToken, fetchAccounts, fetchTransactions, setAccessToken } from '../api/plaid.js';
import { sendVerificationCode, verifyVerificationCode } from '../api/auth.js';

const DASHBOARD_TABS = [
  { key: 'balances', label: 'Account Balances' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'stocks', label: 'Stocks' },
  { key: 'analysis', label: 'Analysis' }

];

const TRANSACTIONS_PER_PAGE = 10;

export default function DashboardPage() {
  const { user, token, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [linkToken, setLinkToken] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);
  const [transactionsInitialized, setTransactionsInitialized] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
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

  const loadTransactions = useCallback(async () => {
    if (!token) {
      return;
    }
    setTransactionsLoading(true);
    setTransactionsError(null);
    try {
      const response = await fetchTransactions(token);
      const fetchedTransactions =
        response.transactions ?? response.latest_transactions ?? [];
      setTransactions(fetchedTransactions);
      setTransactionsPage(1);
    } catch (err) {
      console.error('Unable to load transactions', err);
      setTransactionsError(err.message ?? 'Unable to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (activeTab !== 'transactions' || transactionsInitialized || !token) {
      return;
    }
    setTransactionsInitialized(true);
    loadTransactions();
  }, [activeTab, loadTransactions, token, transactionsInitialized]);

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

  const spendingBreakdown = useMemo(() => {
    const totals = new Map();
    let total = 0;

    transactions.forEach((transaction) => {
      const rawAmount = Number(transaction?.amount);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        return;
      }
      const categoryKey =
        transaction.personal_finance_category?.primary ||
        (transaction.category?.[0] ?? 'uncategorized');
      const amount = rawAmount;
      const currency =
        transaction.iso_currency_code ||
        transaction.unofficial_currency_code ||
        'USD';

      total += amount;
      const existing = totals.get(categoryKey);
      if (existing) {
        existing.amount += amount;
      } else {
        totals.set(categoryKey, { amount, currency });
      }
    });

    const categories = Array.from(totals.entries())
      .map(([key, value]) => ({
        key: key || 'uncategorized',
        amount: value.amount,
        currency: value.currency
      }))
      .sort((a, b) => b.amount - a.amount);

    return { total, categories };
  }, [transactions]);

  const hasAccounts = accounts.length > 0;
  const hasTransactions = transactions.length > 0;
  const spendingBreakdownTotalCurrency =
    spendingBreakdown.categories[0]?.currency || 'USD';
  const showSpendingBreakdown =
    spendingBreakdown.total > 0 && spendingBreakdown.categories.length > 0;
  const totalTransactionPages = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE));
  const paginatedTransactions = useMemo(() => {
    const start = (transactionsPage - 1) * TRANSACTIONS_PER_PAGE;
    return transactions.slice(start, start + TRANSACTIONS_PER_PAGE);
  }, [transactions, transactionsPage]);
  const paginationStartIndex = (transactionsPage - 1) * TRANSACTIONS_PER_PAGE;
  const paginationEndIndex = Math.min(
    paginationStartIndex + TRANSACTIONS_PER_PAGE,
    transactions.length
  );
  const transactionsDisplayStart = hasTransactions ? paginationStartIndex + 1 : 0;
  const transactionsDisplayEnd = hasTransactions ? paginationEndIndex : 0;
  const canGoPrevTransactions = transactionsPage > 1;
  const canGoNextTransactions = transactionsPage < totalTransactionPages;

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE));
    setTransactionsPage((current) => {
      if (!transactions.length) {
        return 1;
      }
      if (current > maxPage) {
        return maxPage;
      }
      return current;
    });
  }, [transactions]);

  const handlePrevTransactionsPage = () => {
    if (!canGoPrevTransactions) {
      return;
    }
    setTransactionsPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextTransactionsPage = () => {
    if (!canGoNextTransactions) {
      return;
    }
    setTransactionsPage((prev) => Math.min(prev + 1, totalTransactionPages));
  };

  const accountLookup = useMemo(() => {
    const lookup = new Map();
    accounts.forEach((account) => {
      if (account?.account_id) {
        lookup.set(account.account_id, account);
      }
    });
    return lookup;
  }, [accounts]);

  const getCurrencyCode = (account) =>
    account?.balances?.iso_currency_code || account?.balances?.unofficial_currency_code || 'USD';

  const formatCurrency = (value, currencyCode = 'USD') => {
    if (value === null || value === undefined) {
      return '—';
    }
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return `${value}`;
    }
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode
      }).format(numericValue);
    } catch (_error) {
      return `$${numericValue.toLocaleString()}`;
    }
  };

  const formatBalance = (value, account) => formatCurrency(value, getCurrencyCode(account));

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

  const getTransactionCurrency = (transaction) =>
    transaction?.iso_currency_code || transaction?.unofficial_currency_code || 'USD';

  const formatTransactionDate = (value) => {
    if (!value) {
      return '—';
    }
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(new Date(`${value}T00:00:00`));
    } catch (_error) {
      return value;
    }
  };

  const formatTextLabel = (value) =>
    value
      ?.toString()
      .split(/[_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || '';

  const formatTransactionAmount = (transaction) => {
    const amount = Number(transaction?.amount ?? 0);
    if (Number.isNaN(amount)) {
      return '—';
    }
    const currencyCode = getTransactionCurrency(transaction);
    const formatted = formatCurrency(Math.abs(amount), currencyCode);
    if (amount < 0) {
      return `+${formatted}`;
    }
    if (amount > 0) {
      return `-${formatted}`;
    }
    return formatted;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Hello, {user?.name ?? 'there'}!</h1>
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
              className="dashboard-panel"
            >
              <div className="dashboard-actions">
                <button
                  className="auth-button"
                  type="button"
                  onClick={loadTransactions}
                  disabled={transactionsLoading}
                >
                  {transactionsLoading
                    ? hasTransactions
                      ? 'Refreshing…'
                      : 'Loading…'
                    : 'Refresh transactions'}
                </button>
              </div>

              {transactionsError ? <p className="dashboard-error">{transactionsError}</p> : null}

              {transactionsLoading && !hasTransactions ? <p>Loading transactions…</p> : null}

              {hasTransactions ? (
                <div
                  className={`transaction-content${
                    showSpendingBreakdown ? ' has-breakdown' : ''
                  }`}
                >
                  <section className="transaction-feed" aria-label="Recent transactions">
                    <div className="transaction-feed-header">
                      <h3>Recent activity</h3>
                      <span className="transaction-feed-meta">
                        {transactions.length} transaction
                        {transactions.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <div className="transaction-list" role="list">
                      {paginatedTransactions.map((transaction) => {
                        const transactionKey =
                          transaction.transaction_id ||
                          transaction.pending_transaction_id ||
                          `${transaction.account_id}-${transaction.date}-${transaction.name}`;
                        const account = accountLookup.get(transaction.account_id);
                        const accountTitle = account ? getAccountTitle(account) : null;
                        const institutionName = account ? getInstitutionName(account) : null;
                        const backgroundColor = transaction.personal_finance_category?.confidence_level === 'VERY_HIGH' ? "#faafaf" : "#fff";
                        const accountLabel =
                          institutionName && accountTitle && institutionName !== accountTitle
                            ? `${institutionName} · ${accountTitle}`
                            : institutionName || accountTitle;
                        const categoryLabel = transaction.personal_finance_category?.primary
                          ? formatTextLabel(transaction.personal_finance_category.primary)
                          : transaction.category?.length
                          ? transaction.category.join(' • ')
                          : '';
                        const confidenceLevel = transaction.personal_finance_category?.confidence_level;
                        const amountText = formatTransactionAmount(transaction);
                        const isCredit = Number(transaction?.amount ?? 0) < 0;
                        const formattedDate = formatTransactionDate(transaction.date);
                        const transactionName =
                          transaction.merchant_name || transaction.name || 'Transaction';

                        return (
                          <article className="transaction-item" role="listitem" key={transactionKey} style={{backgroundColor}}>
                            <div className="transaction-item-header">
                              <h4 className="transaction-name">{transactionName}</h4>
                              <span
                                className={`transaction-amount${
                                  isCredit ? ' is-credit' : ' is-debit'
                                }`}
                              >
                                {amountText}
                              </span>
                            </div>
                            <div className="transaction-meta">
                              {formattedDate && formattedDate !== '—' ? (
                                <span className="transaction-meta-item">{formattedDate}</span>
                              ) : null}
                              {accountLabel ? (
                                <span className="transaction-meta-item">{accountLabel}</span>
                              ) : null}
                              {categoryLabel ? (
                                <span className="transaction-meta-item">{categoryLabel}</span>
                              ) : null}
                              {transaction.pending ? (
                                <span className="transaction-meta-item transaction-status">
                                  Pending
                                </span>
                              ) : null}
                            </div>
                            {transaction.location?.city || transaction.location?.region ? (
                              <div className="transaction-location">
                                <span>
                                  {[transaction.location?.city, transaction.location?.region]
                                    .filter(Boolean)
                                    .join(', ')}
                                </span>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}
                    </div>
                    <div className="transaction-pagination">
                      <span className="transaction-pagination-info">
                        Showing {transactionsDisplayStart}-{transactionsDisplayEnd} of{' '}
                        {transactions.length}
                      </span>
                      <div className="transaction-pagination-controls">
                        <button
                          className="transaction-page-button"
                          type="button"
                          onClick={handlePrevTransactionsPage}
                          disabled={!canGoPrevTransactions || transactionsLoading}
                        >
                          Previous
                        </button>
                        <span className="transaction-pagination-page">
                          Page {transactionsPage} of {totalTransactionPages}
                        </span>
                        <button
                          className="transaction-page-button"
                          type="button"
                          onClick={handleNextTransactionsPage}
                          disabled={!canGoNextTransactions || transactionsLoading}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </section>
                  {showSpendingBreakdown ? (
                    <aside
                      className="transaction-breakdown"
                      role="complementary"
                      aria-label="Spending by category"
                    >
                      <div className="transaction-breakdown-header">
                        <h3>Spending by category</h3>
                        <span className="transaction-breakdown-total">
                          {formatCurrency(spendingBreakdown.total, spendingBreakdownTotalCurrency)}
                        </span>
                      </div>
                      <div className="transaction-breakdown-list">
                        {spendingBreakdown.categories.map((category) => {
                          const percent =
                            spendingBreakdown.total > 0
                              ? (category.amount / spendingBreakdown.total) * 100
                              : 0;
                          const displayPercent =
                            percent >= 10
                              ? Math.round(percent)
                              : percent >= 1
                              ? Number(percent.toFixed(1))
                              : Number(percent.toFixed(2));
                          const categoryLabel =
                            formatTextLabel(category.key) || 'Uncategorized';

                          return (
                            <div className="transaction-breakdown-item" key={category.key}>
                              <div className="transaction-breakdown-labels">
                                <span className="transaction-breakdown-label">{categoryLabel}</span>
                                <span className="transaction-breakdown-percent">
                                  {displayPercent}%
                                </span>
                              </div>
                              <div
                                className="transaction-breakdown-bar"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(percent)}
                                aria-valuetext={`${categoryLabel} ${percent.toFixed(1)}%`}
                              >
                                <div
                                  className="transaction-breakdown-fill"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className="transaction-breakdown-amount">
                                {formatCurrency(category.amount, category.currency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </aside>
                  ) : null}
                </div>
              ) : !transactionsLoading ? (
                <p>
                  {hasAccounts
                    ? 'No recent transactions yet. Try refreshing again shortly.'
                    : 'Connect a bank account to start pulling transaction history.'}
                </p>
              ) : null}
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
