import { useEffect, useState } from 'react';

export default function DashboardView({
  user,
  isVerified,
  signOut,
  tabs,
  verification,
  link,
  accounts,
  transactions,
  investments,
  analysis,
  lookups,
  formatters
}) {
  const { active, definitions, onSelect, onKeyDown } = tabs;
  const [isMobileTabs, setIsMobileTabs] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(max-width: 640px)').matches;
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const handleChange = (event) => setIsMobileTabs(event.matches);
    handleChange(mediaQuery);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);
  useEffect(() => {
    if (!isMobileTabs) {
      setIsMobileNavOpen(false);
    }
  }, [isMobileTabs]);
  const handleToggleMobileTabs = () => {
    setIsMobileNavOpen((open) => !open);
  };
  const handleSelectTab = (tabKey) => {
    onSelect(tabKey);
    if (isMobileTabs) {
      setIsMobileNavOpen(false);
    }
  };
  const activeTabDefinition = definitions.find((tab) => tab.key === active);
  const activeTabLabel = activeTabDefinition?.label ?? 'Dashboard';
  const tabsMenuId = 'dashboard-tabs-menu';
  const isMobileMenuOpen = isMobileTabs && isMobileNavOpen;
  const tabsClassName = ['dashboard-tabs', isMobileTabs ? 'is-mobile' : '', isMobileMenuOpen ? 'is-open' : '']
    .filter(Boolean)
    .join(' ');
  const tabsContainerClassName = [
    'dashboard-tabs-container',
    isMobileTabs ? 'is-mobile' : '',
    isMobileMenuOpen ? 'is-open' : ''
  ]
    .filter(Boolean)
    .join(' ');
  const {
    isOpen: verificationOpen,
    status: verificationStatus,
    hasRequestedCode,
    code,
    onCodeChange,
    onSend: handleSendCode,
    onVerify: handleVerifyCode,
    onToggle: handleToggleVerification
  } = verification;
  const { ready, working, onConnect: handleConnectBank } = link;
  const {
    items: accountItems,
    loading: accountsLoading,
    hasAny: hasAccounts,
    onRefresh: refreshAccounts,
    error: accountsError
  } = accounts;
  const {
    items: allTransactions,
    paginated: paginatedTransactions,
    loading: transactionsLoading,
    error: transactionsError,
    hasAny: hasTransactions,
    page: transactionsPage,
    totalPages: totalTransactionPages,
    displayStart: transactionsDisplayStart,
    displayEnd: transactionsDisplayEnd,
    canGoPrev: canGoPrevTransactions,
    canGoNext: canGoNextTransactions,
    onPrevPage: handlePrevTransactionsPage,
    onNextPage: handleNextTransactionsPage,
    onRefresh: refreshTransactions
  } = transactions;
  const {
    accounts: investmentAccounts,
    holdings: investmentHoldings,
    securities: investmentSecurities,
    transactions: investmentTransactions,
    displayedTransactions,
    loading: investmentsLoading,
    error: investmentsError,
    hasAccounts: hasInvestmentAccounts,
    hasHoldings: hasInvestmentHoldings,
    hasTransactions: hasInvestmentTransactions,
    totals,
    currencies,
    onRefresh: refreshInvestments
  } = investments;
  const { investmentValue: totalInvestmentValue, holdingsValue: totalHoldingsValue } = totals;
  const { summary: investmentSummaryCurrency, holdings: holdingsSummaryCurrency } = currencies;
  const spendingAnalysis = analysis?.spending ?? {};
  const {
    showBreakdown = false,
    breakdown: spendingBreakdown = { total: 0, categories: [] },
    currency: spendingBreakdownTotalCurrency = 'USD'
  } = spendingAnalysis;
  const quantAnalysis = analysis?.quant ?? {};
  const {
    initialized: quantInitialized = false,
    assets: quantAssets = [],
    assetsLoading: quantAssetsLoading = false,
    assetsError: quantAssetsError = null,
    hasAssets: hasQuantAssets = false,
    onRefresh: refreshQuantAnalysis = () => {},
    portfolio: {
      result: portfolioResult = null,
      loading: portfolioLoading = false,
      error: portfolioError = null,
      lastRunAt: portfolioLastRunAt = null,
      params: portfolioParams = null
    } = {},
    assetModal: assetModalState = { isOpen: false },
    onSimulateAsset: handleSimulateAsset = () => {},
    onCloseAssetModal: handleCloseAssetModal = () => {}
  } = quantAnalysis;
  const {
    isOpen: isAssetModalOpen = false,
    asset: activeAsset = null,
    loading: assetModalLoading = false,
    error: assetModalError = null,
    result: assetModalResult = null
  } = assetModalState ?? {};
  const { account: accountLookup, security: securitiesLookup } = lookups;
  const {
    getInstitutionName,
    getAccountTitle,
    getLogoSrc,
    getLogoInitial,
    formatAccountType,
    formatBalance,
    formatCurrency,
    formatSignedCurrency,
    formatTextLabel,
    formatTransactionAmount,
    formatTransactionDate,
    formatQuantity,
    formatPercentChange,
    getCurrencyCode,
    getTransactionBackground
  } = formatters;

  const formatAbsolutePercent = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return '—';
    }
    const percent = Math.abs(numericValue) <= 1 ? numericValue * 100 : numericValue;
    return `${percent.toFixed(2)}%`;
  };

  const formatReturnText = (value) => formatPercentChange(value) ?? '—';

  const portfolioLastRunLabel = portfolioLastRunAt
    ? (() => {
        try {
          return new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
          }).format(new Date(portfolioLastRunAt));
        } catch (_error) {
          return portfolioLastRunAt;
        }
      })()
    : null;

  const portfolioInitialValue = Number(portfolioResult?.params?.V0);
  const hasInitialValue = Number.isFinite(portfolioInitialValue);
  const varValue =
    hasInitialValue && Number.isFinite(portfolioResult?.portfolioVar95)
      ? portfolioInitialValue * (1 + portfolioResult.portfolioVar95)
      : null;
  const cvarValue =
    hasInitialValue && Number.isFinite(portfolioResult?.portfolioCvar95)
      ? portfolioInitialValue * (1 + portfolioResult.portfolioCvar95)
      : null;
  const assetsModeled = quantAssets.length;
  const normalizedPaths = Number(portfolioParams?.n_paths);
  const normalizedSteps = Number(portfolioParams?.n_steps);
  const formattedPaths = Number.isFinite(normalizedPaths)
    ? normalizedPaths.toLocaleString('en-US')
    : null;
  const formattedSteps = Number.isFinite(normalizedSteps)
    ? normalizedSteps.toLocaleString('en-US')
    : null;
  const simulationMeta =
    formattedPaths || formattedSteps
      ? `${formattedPaths ?? '—'} simulated paths · ${formattedSteps ?? '—'} time steps`
      : null;

  const portfolioSummaryCards = [
    {
      label: 'Current portfolio value',
      value: formatCurrency(hasInitialValue ? portfolioInitialValue : null, investmentSummaryCurrency),
      meta: portfolioLastRunLabel ? `Last run ${portfolioLastRunLabel}` : 'Awaiting simulation'
    },
    {
      label: 'Projected mean value',
      value: formatCurrency(portfolioResult?.meanFinalValue, investmentSummaryCurrency),
      meta: `Std dev ${formatCurrency(portfolioResult?.stdFinalValue, investmentSummaryCurrency)}`
    },
    {
      label: 'Expected return',
      value: formatReturnText(portfolioResult?.expectedReturn),
      meta: `${assetsModeled} asset${assetsModeled === 1 ? '' : 's'} modeled`
    },
    {
      label: '5% VaR / CVaR',
      value: formatCurrency(varValue, investmentSummaryCurrency),
      meta: cvarValue ? `ES ${formatCurrency(cvarValue, investmentSummaryCurrency)}` : '—'
    }
  ];

  const activeAssetTicker = activeAsset?.ticker || activeAsset?.symbol || null;
  const assetModalParams = assetModalResult?.params ?? {};
  const assetModalInitialValue = Number(assetModalParams?.initialValue);
  const assetModalPaths = Number(assetModalParams?.n_paths);
  const assetModalSteps = Number(assetModalParams?.n_steps);
  const assetModalSimMeta =
    Number.isFinite(assetModalPaths) || Number.isFinite(assetModalSteps)
      ? `${Number.isFinite(assetModalPaths) ? assetModalPaths.toLocaleString('en-US') : '—'} simulated paths · ${
          Number.isFinite(assetModalSteps) ? assetModalSteps : '—'
        } time steps`
      : null;
  const assetVarValue =
    Number.isFinite(assetModalResult?.AssetVar95) && Number.isFinite(assetModalInitialValue)
      ? assetModalInitialValue * (1 + assetModalResult.AssetVar95)
      : null;
  const assetCvarValue =
    Number.isFinite(assetModalResult?.AssetCvar95) && Number.isFinite(assetModalInitialValue)
      ? assetModalInitialValue * (1 + assetModalResult.AssetCvar95)
      : null;
  const assetWeightText = formatAbsolutePercent(assetModalParams?.weight);
  const assetModalCards = assetModalResult
    ? [
        {
          label: 'Price today',
          value: formatCurrency(assetModalParams?.S0, investmentSummaryCurrency),
          meta: assetWeightText ? `Weight ${assetWeightText}` : null
        },
        {
          label: 'Mean final value',
          value: formatCurrency(assetModalResult.meanFinalValue, investmentSummaryCurrency),
          meta: `Std dev ${formatCurrency(assetModalResult.stdFinalValue, investmentSummaryCurrency)}`
        },
        {
          label: 'Expected return',
          value: formatReturnText(assetModalResult.expectedReturn),
          meta: portfolioLastRunLabel ? `Last run ${portfolioLastRunLabel}` : null
        },
        {
          label: '5% VaR / CVaR',
          value: formatCurrency(assetVarValue, investmentSummaryCurrency),
          meta: assetCvarValue ? `ES ${formatCurrency(assetCvarValue, investmentSummaryCurrency)}` : '—'
        },
        {
          label: 'Position value',
          value: formatCurrency(assetModalInitialValue, investmentSummaryCurrency),
          meta: activeAsset?.Name ?? null
        },
        {
          label: 'Median final value',
          value: formatCurrency(assetModalResult.FinalValue, investmentSummaryCurrency),
          meta: 'Median of terminal distribution'
        }
      ]
    : [];

  return (
    <>
      <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Hello, {user?.name ?? 'there'}!</h1>
          <p className="dashboard-subtitle">This is your dashboard home.</p>
        </div>
        <button className="auth-button" type="button" onClick={signOut}>
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
                  {verificationStatus.sending
                    ? 'Sending…'
                    : hasRequestedCode
                    ? 'Resend code'
                    : 'Send code'}
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
                  onChange={(event) => onCodeChange(event.target.value)}
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  placeholder="Enter 6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <button
                  className="auth-button"
                  type="submit"
                  disabled={verificationStatus.verifying}
                >
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
        <div className={tabsContainerClassName}>
          {isMobileTabs ? (
            <button
              type="button"
              className="dashboard-tabs-toggle"
              aria-expanded={isMobileMenuOpen}
              aria-controls={tabsMenuId}
              onClick={handleToggleMobileTabs}
            >
              <span className="dashboard-tabs-toggle-text">
                <span className="dashboard-tabs-toggle-title">Dashboard sections</span>
                <span className="dashboard-tabs-toggle-active">{activeTabLabel}</span>
              </span>
              <span className="dashboard-tabs-toggle-icon" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          ) : null}

          <nav
            id={tabsMenuId}
            className={tabsClassName}
            aria-label="Dashboard sections"
            role="tablist"
            aria-hidden={isMobileTabs && !isMobileNavOpen}
          >
            {definitions.map((tab) => {
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={tab.buttonId}
                  aria-selected={isActive}
                  aria-controls={tab.panelId}
                  className={`dashboard-tab${isActive ? ' is-active' : ''}`}
                  onClick={() => handleSelectTab(tab.key)}
                  onKeyDown={onKeyDown}
                  tabIndex={isActive ? 0 : -1}
                >
                  <span className="dashboard-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="dashboard-tab-content">
          {active === 'balances' ? (
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
                  disabled={!ready || working || !isVerified}
                >
                  {isVerified ? 'Connect a bank' : 'Verify account to connect'}
                </button>
                <button
                  className="auth-button"
                  type="button"
                  onClick={refreshAccounts}
                  disabled={accountsLoading}
                >
                  {accountsLoading ? 'Refreshing…' : 'Refresh balances'}
                </button>
              </div>

              {accountsError ? <p className="dashboard-error">{accountsError}</p> : null}

              {accountsLoading ? (
                <p>Loading balances…</p>
              ) : hasAccounts ? (
                <div className="account-grid">
                  {accountItems.map((account) => {
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

          {active === 'transactions' ? (
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
                  onClick={refreshTransactions}
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
                  className={`transaction-content${showBreakdown ? ' has-breakdown' : ''}`}
                >
                  <section className="transaction-feed" aria-label="Recent transactions">
                    <div className="transaction-feed-header">
                      <h3>Recent activity</h3>
                      <span className="transaction-feed-meta">
                        {allTransactions.length} transaction
                        {allTransactions.length === 1 ? '' : 's'}
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
                        const backgroundColor = getTransactionBackground(transaction);
                        const accountLabel =
                          institutionName && accountTitle && institutionName !== accountTitle
                            ? `${institutionName} · ${accountTitle}`
                            : institutionName || accountTitle;
                        const categoryLabel = transaction.personal_finance_category?.primary
                          ? formatTextLabel(transaction.personal_finance_category.primary)
                          : transaction.category?.length
                          ? transaction.category.join(' • ')
                          : '';
                        const amountText = formatTransactionAmount(transaction);
                        const isCredit = Number(transaction?.amount ?? 0) < 0;
                        const formattedDate = formatTransactionDate(transaction.date);
                        const transactionName =
                          transaction.merchant_name || transaction.name || 'Transaction';

                        return (
                          <article
                            className="transaction-item"
                            role="listitem"
                            key={transactionKey}
                            style={{ backgroundColor }}
                          >
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
                        {allTransactions.length}
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
                  {showBreakdown ? (
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
                                role="presentation"
                                aria-hidden="true"
                              >
                                <span
                                  className="transaction-breakdown-bar-fill"
                                  style={{ width: `${Math.min(displayPercent, 100)}%` }}
                                />
                              </div>
                              <span className="transaction-breakdown-value">
                                {formatCurrency(category.amount, category.currency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </aside>
                  ) : null}
                </div>
              ) : (
                <p>
                  {hasAccounts
                    ? 'No recent transactions yet. Try refreshing again shortly.'
                    : 'Connect a bank account to start pulling transaction history.'}
                </p>
              )}
            </section>
          ) : null}

          {active === 'investments' ? (
            <section
              id="dashboard-panel-investments"
              role="tabpanel"
              aria-labelledby="dashboard-tab-investments"
              className="dashboard-panel"
            >
              <div className="dashboard-actions">
                <button
                  className="auth-button"
                  type="button"
                  onClick={refreshInvestments}
                  disabled={investmentsLoading}
                >
                  {investmentsLoading
                    ? hasInvestmentAccounts
                      ? 'Refreshing…'
                      : 'Loading…'
                    : 'Refresh investments'}
                </button>
              </div>

              {investmentsError ? <p className="dashboard-error">{investmentsError}</p> : null}

              {investmentsLoading && !hasInvestmentAccounts ? (
                <p>Loading investment accounts…</p>
              ) : null}

              {hasInvestmentAccounts ? (
                <section className="investment-section" aria-label="Investment accounts">
                  <div className="investment-section-header">
                    <h3>Investment accounts</h3>
                    <span className="investment-section-total">
                      {formatCurrency(totalInvestmentValue, investmentSummaryCurrency)}
                    </span>
                  </div>
                  <div className="account-grid">
                    {investmentAccounts.map((account, index) => {
                      const institutionName = getInstitutionName(account);
                      const accountTitle = getAccountTitle(account);
                      const mask = account.mask ? `•••• ${account.mask}` : '';
                      const accountType = formatAccountType(account);
                      const logoSrc = getLogoSrc(account);
                      const cashBalanceValue =
                        account?.balances?.available ?? account?.balances?.cash ?? null;
                      const accountKey =
                        account.account_id ??
                        `${account.name ?? 'investment'}-${account.mask ?? index}`;

                      return (
                        <article className="account-card" key={accountKey}>
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
                                {institutionName || 'Linked brokerage'}
                                {mask ? ` · ${mask}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="account-card-body">
                            <div>
                              <span className="account-metric-label">Account value</span>
                              <span className="account-metric-value">
                                {formatBalance(account.balances?.current, account)}
                              </span>
                            </div>
                            <div>
                              <span className="account-metric-label">Cash balance</span>
                              <span className="account-metric-value">
                                {formatBalance(cashBalanceValue, account)}
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
                </section>
              ) : !investmentsLoading ? (
                <p>
                  Connect a brokerage account to view investment balances and positions once they are
                  available.
                </p>
              ) : null}

              {hasInvestmentHoldings ? (
                <section className="investment-section" aria-label="Current holdings">
                  <div className="investment-section-header">
                    <h3>Holdings overview</h3>
                    <span className="investment-section-total">
                      {formatCurrency(totalHoldingsValue, holdingsSummaryCurrency)}
                    </span>
                  </div>
                  <div className="account-grid">
                    {investmentHoldings.map((holding, index) => {
                      const security = securitiesLookup.get(holding.security_id);
                      const account = accountLookup.get(holding.account_id);
                      const currencyCode =
                        holding.iso_currency_code ||
                        holding.unofficial_currency_code ||
                        getCurrencyCode(account);
                      const quantityText = formatQuantity(holding.quantity);
                      const priceText = formatCurrency(holding.institution_price, currencyCode);
                      const valueText = formatCurrency(holding.institution_value, currencyCode);
                      const costBasisText =
                        holding.cost_basis !== undefined && holding.cost_basis !== null
                          ? formatCurrency(holding.cost_basis, currencyCode)
                          : null;
                      const gainText =
                        holding.unrealized_gain !== undefined && holding.unrealized_gain !== null
                          ? formatSignedCurrency(holding.unrealized_gain, currencyCode)
                          : null;
                      const gainPercentText = formatPercentChange(
                        holding.unrealized_gain_percentage
                      );
                      const title = security?.name || security?.ticker_symbol || 'Holding';
                      const identifierLabel =
                        security?.ticker_symbol || security?.cusip || security?.isin || '';
                      const holdingKey =
                        holding.security_id ??
                        `${title}-${holding.account_id ?? 'account'}-${index}`;
                      const accountLabel = account ? getAccountTitle(account) : 'Investment account';
                      const typeLabel = security?.type ? formatTextLabel(security.type) : null;

                      return (
                        <article className="account-card" key={holdingKey}>
                          <div className="account-card-header">
                            <div className="account-logo">
                              <span>{identifierLabel ? identifierLabel.charAt(0) : 'S'}</span>
                            </div>
                            <div className="account-card-titles">
                              <h3>{title}</h3>
                              <p>
                                {identifierLabel ? `${identifierLabel}` : ''}
                                {identifierLabel && accountLabel ? ' · ' : ''}
                                {accountLabel}
                              </p>
                            </div>
                          </div>
                          <div className="account-card-body">
                            <div>
                              <span className="account-metric-label">Market value</span>
                              <span className="account-metric-value">{valueText}</span>
                            </div>
                            <div>
                              <span className="account-metric-label">Quantity</span>
                              <span className="account-metric-value">{quantityText}</span>
                            </div>
                            <div>
                              <span className="account-metric-label">Price</span>
                              <span className="account-metric-value">{priceText}</span>
                            </div>
                          </div>
                          <div className="account-card-body">
                            <div>
                              <span className="account-metric-label">Cost basis</span>
                              <span className="account-metric-value">
                                {costBasisText ?? '—'}
                              </span>
                            </div>
                            <div>
                              <span className="account-metric-label">Unrealized gain</span>
                              <span className="account-metric-value">
                                {gainText ?? '—'}
                                {gainPercentText ? ` (${gainPercentText})` : ''}
                              </span>
                            </div>
                          </div>
                          {(typeLabel || security?.ticker_symbol) && (
                            <div className="account-card-footer">
                              {typeLabel ? <span className="account-tag">{typeLabel}</span> : null}
                              {security?.ticker_symbol ? (
                                <span className="account-tag">{security.ticker_symbol}</span>
                              ) : null}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : hasInvestmentAccounts && !investmentsLoading ? (
                <p>Holdings data will appear once positions sync from your brokerage.</p>
              ) : null}

              {hasInvestmentTransactions ? (
                <section
                  className="investment-section"
                  aria-label="Recent investment transactions"
                >
                  <div className="investment-section-header">
                    <h3>Recent investment transactions</h3>
                    <span className="investment-section-total">
                      {investmentTransactions.length} transaction
                      {investmentTransactions.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="transaction-list" role="list">
                    {displayedTransactions.map((transaction) => {
                      const security = securitiesLookup.get(transaction.security_id);
                      const account = accountLookup.get(transaction.account_id);
                      const currencyCode =
                        transaction.iso_currency_code ||
                        transaction.unofficial_currency_code ||
                        getCurrencyCode(account);
                      const amountValue = Number(transaction.amount ?? 0);
                      const signedAmount = formatSignedCurrency(amountValue, currencyCode);
                      const quantityText = formatQuantity(transaction.quantity);
                      const priceText =
                        transaction.price !== undefined && transaction.price !== null
                          ? formatCurrency(transaction.price, currencyCode)
                          : null;
                      const feesText =
                        transaction.fees !== undefined && transaction.fees !== null
                          ? formatCurrency(transaction.fees, currencyCode)
                          : null;
                      const transactionType = transaction.type
                        ? formatTextLabel(transaction.type)
                        : null;
                      const transactionSubtype = transaction.subtype
                        ? formatTextLabel(transaction.subtype)
                        : null;
                      const securityLabel = security?.name || security?.ticker_symbol || 'Security';
                      const accountLabel = account ? getAccountTitle(account) : 'Investment account';
                      const dateText = formatTransactionDate(transaction.date);
                      const transactionKey =
                        transaction.investment_transaction_id ||
                        `${transaction.account_id}-${transaction.security_id}-${transaction.date}`;

                      return (
                        <article className="transaction-item" role="listitem" key={transactionKey}>
                          <div className="transaction-item-header">
                            <h4 className="transaction-name">{securityLabel}</h4>
                            <span className="transaction-amount">{signedAmount}</span>
                          </div>
                          <div className="transaction-meta">
                            {dateText ? (
                              <span className="transaction-meta-item">{dateText}</span>
                            ) : null}
                            {transactionType ? (
                              <span className="transaction-meta-item">{transactionType}</span>
                            ) : null}
                            {transactionSubtype ? (
                              <span className="transaction-meta-item">{transactionSubtype}</span>
                            ) : null}
                            {accountLabel ? (
                              <span className="transaction-meta-item">{accountLabel}</span>
                            ) : null}
                          </div>
                          <div className="transaction-meta">
                            <span className="transaction-meta-item">Qty {quantityText}</span>
                            {priceText ? (
                              <span className="transaction-meta-item">Price {priceText}</span>
                            ) : null}
                            {feesText ? (
                              <span className="transaction-meta-item">Fees {feesText}</span>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}

          {active === 'analysis' ? (
            <section
              id="dashboard-panel-analysis"
              role="tabpanel"
              aria-labelledby="dashboard-tab-analysis"
              className="dashboard-panel analysis-panel"
            >
              <div className="analysis-hero">
                <div className="analysis-hero-copy">
                  <p className="analysis-kicker">Monte Carlo analysis</p>
                  <h2>Project potential outcomes for your portfolio and individual holdings.</h2>
                  <p className="analysis-description">
                    Use a GBM Monte Carlo simulation to understand potential terminal values, volatility,
                    and tail risk for the assets in your connected accounts.
                  </p>
                </div>
                <button
                  className="analysis-primary-button"
                  type="button"
                  onClick={refreshQuantAnalysis}
                  disabled={portfolioLoading || quantAssetsLoading}
                >
                  {portfolioLoading || quantAssetsLoading ? 'Running simulation…' : 'Re-run portfolio simulation'}
                </button>
              </div>

              {portfolioLoading ? (
                <p className="analysis-status">Running Monte Carlo simulation on your current portfolio…</p>
              ) : null}

              {portfolioError ? <p className="dashboard-error">{portfolioError}</p> : null}
              {quantAssetsError ? <p className="dashboard-error">{quantAssetsError}</p> : null}

              <div className="analysis-summary" aria-live="polite">
                {portfolioSummaryCards.map((card) => (
                  <article className="analysis-summary-card" key={card.label}>
                    <span className="analysis-summary-label">{card.label}</span>
                    <span className="analysis-summary-value">{card.value}</span>
                    {card.meta ? <span className="analysis-summary-meta">{card.meta}</span> : null}
                  </article>
                ))}
              </div>

              {simulationMeta ? <p className="analysis-meta-line">{simulationMeta}</p> : null}

              <div className="analysis-section-header">
                <div>
                  <h3>Asset stress tests</h3>
                  <p>Select a holding to run a dedicated Monte Carlo simulation.</p>
                </div>
              </div>

              {quantAssetsLoading && !hasQuantAssets ? (
                <p className="analysis-status">Loading holdings for per-asset analysis…</p>
              ) : null}

              {hasQuantAssets ? (
                <div className="analysis-assets-grid">
                  {quantAssets.map((asset, index) => {
                    const weightText = formatAbsolutePercent(asset.weight);
                    const driftText = formatAbsolutePercent(asset.mu);
                    const volText = formatAbsolutePercent(asset.sigma);
                    const ticker = asset.ticker || asset.symbol || '';
                    const assetKey = asset.security_id || asset.id || `${asset.Name}-${index}`;
                    const isAssetBusy =
                      assetModalLoading && activeAsset?.Name === asset.Name && isAssetModalOpen;

                    return (
                      <article className="analysis-asset-card" key={assetKey}>
                        <div className="analysis-asset-top">
                          <div>
                            <p className="analysis-asset-name">{asset.Name}</p>
                            {ticker ? <span className="analysis-asset-link">{ticker}</span> : null}
                            <p className="analysis-asset-source">Plaid holding</p>
                          </div>
                          <div className="analysis-asset-value">
                            {formatCurrency(asset.S0, investmentSummaryCurrency)}
                          </div>
                        </div>
                        <div className="analysis-asset-meta">
                          <span>Weight {weightText}</span>
                          <span>μ {driftText}</span>
                          <span>σ {volText}</span>
                        </div>
                        <button
                          className="analysis-asset-button"
                          type="button"
                          onClick={() => handleSimulateAsset(asset)}
                          disabled={isAssetBusy}
                        >
                          {isAssetBusy ? 'Simulating…' : 'Run Monte Carlo'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : !quantAssetsLoading && quantInitialized ? (
                <p className="analysis-status">
                  {hasInvestmentHoldings
                    ? 'We could not derive asset weights to analyze yet.'
                    : 'Connect an investment account to see per-asset analytics.'}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </div>
      {isAssetModalOpen ? (
        <div
          className="analysis-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Monte Carlo analysis for ${activeAsset?.Name ?? 'asset'}`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseAssetModal();
            }
          }}
        >
          <div className="analysis-modal-card">
            <header className="analysis-modal-header">
              <div>
                <p className="analysis-modal-subtitle">{activeAssetTicker ?? 'Monte Carlo'}</p>
                <h3>{activeAsset?.Name ?? 'Asset'}</h3>
              </div>
              <button
                type="button"
                className="analysis-modal-close"
                onClick={handleCloseAssetModal}
                aria-label="Close analysis dialog"
              >
                Close
              </button>
            </header>
            {assetModalLoading ? (
              <p>Running simulation…</p>
            ) : assetModalError ? (
              <p className="dashboard-error">{assetModalError}</p>
            ) : assetModalResult ? (
              <div className="analysis-modal-grid">
                {assetModalCards.map((card) => (
                  <article className="analysis-modal-card-item" key={card.label}>
                    <span className="analysis-summary-label">{card.label}</span>
                    <span className="analysis-summary-value">{card.value}</span>
                    {card.meta ? <span className="analysis-summary-meta">{card.meta}</span> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p>No simulation data yet.</p>
            )}
            {assetModalSimMeta ? (
              <div className="analysis-modal-footer">
                {assetModalSimMeta}
                {portfolioLastRunLabel ? (
                  <span className="analysis-modal-footer-meta"> · Last run {portfolioLastRunLabel}</span>
                ) : null}
              </div>
            ) : null}
            <div className="analysis-modal-actions">
              <button
                className="auth-button"
                type="button"
                onClick={() => handleSimulateAsset(activeAsset)}
                disabled={assetModalLoading}
              >
                {assetModalLoading ? 'Simulating…' : 'Rerun simulation'}
              </button>
              <button
                className="analysis-modal-dismiss"
                type="button"
                onClick={handleCloseAssetModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
