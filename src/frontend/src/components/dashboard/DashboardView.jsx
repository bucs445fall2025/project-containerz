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
  const {
    showBreakdown,
    breakdown: spendingBreakdown,
    currency: spendingBreakdownTotalCurrency,
    monteCarlo: monteCarloAnalysis
  } = analysis;
  const {
    holdings: analysisHoldingsList = [],
    hasHoldings: hasAnalysisHoldings = false,
    portfolio: portfolioSimulationState = {},
    asset: assetSimulationState = {},
    modal: analysisModalState = {},
    onRunPortfolio: onRunPortfolioSimulation,
    onSelectAsset: onSelectAssetSimulation
  } = monteCarloAnalysis ?? {};
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
  const parseNumeric = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };
  const formatRunTimestamp = (value) => {
    if (!value) {
      return null;
    }
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(new Date(value));
    } catch (_error) {
      return value;
    }
  };

  const portfolioSimData = portfolioSimulationState?.data;
  const portfolioInitialValue = parseNumeric(
    portfolioSimulationState?.meta?.initialValue ??
      portfolioSimData?.params?.V0 ??
      totalHoldingsValue
  );
  const portfolioMeanFinalValue = parseNumeric(portfolioSimData?.meanFinalValue);
  const portfolioStdFinalValue = parseNumeric(portfolioSimData?.stdFinalValue);
  const portfolioExpectedReturn = parseNumeric(portfolioSimData?.expectedReturn);
  const portfolioVar95Return = parseNumeric(portfolioSimData?.portfolioVar95);
  const portfolioCvar95Return = parseNumeric(portfolioSimData?.portfolioCvar95);
  const portfolioVar95FinalValue =
    portfolioInitialValue !== null && portfolioVar95Return !== null
      ? portfolioInitialValue * (1 + portfolioVar95Return)
      : null;
  const portfolioCvar95FinalValue =
    portfolioInitialValue !== null && portfolioCvar95Return !== null
      ? portfolioInitialValue * (1 + portfolioCvar95Return)
      : null;
  const portfolioPathCount =
    ((Array.isArray(portfolioSimData?.portfolioFinalValues) &&
      portfolioSimData.portfolioFinalValues.length)
      ? portfolioSimData.portfolioFinalValues.length
      : null) ??
    (Number.isFinite(Number(portfolioSimulationState?.params?.n_paths))
      ? Number(portfolioSimulationState.params.n_paths)
      : null);
  const portfolioAssetCount =
    portfolioSimData?.params?.n_assets ??
    (hasAnalysisHoldings ? analysisHoldingsList.length : null);
  const portfolioRunTimestamp = formatRunTimestamp(portfolioSimulationState?.runAt);

  const assetSimData = assetSimulationState?.data;
  const assetPosition = assetSimulationState?.position;
  const assetPrice = parseNumeric(assetSimulationState?.asset?.price);
  const assetQuantity = parseNumeric(assetSimulationState?.asset?.quantity);
  const assetCurrency = assetSimulationState?.asset?.currency || 'USD';
  const assetMeanFinalPrice = parseNumeric(assetSimData?.meanFinalPrice);
  const assetStdFinalPrice = parseNumeric(assetSimData?.stdFinalPrice);
  const assetExpectedReturn = parseNumeric(assetSimData?.expectedReturn);
  const assetVar95Return = parseNumeric(assetSimData?.assetVar95);
  const assetCvar95Return = parseNumeric(assetSimData?.assetCvar95);
  const assetVar95Price =
    assetVar95Return !== null && assetPrice !== null ? assetPrice * (1 + assetVar95Return) : null;
  const assetCvar95Price =
    assetCvar95Return !== null && assetPrice !== null ? assetPrice * (1 + assetCvar95Return) : null;
  const assetRunTimestamp = formatRunTimestamp(assetSimulationState?.runAt);
  const assetPathCount =
    (Array.isArray(assetSimData?.finalPrices) && assetSimData.finalPrices.length
      ? assetSimData.finalPrices.length
      : null) ?? null;
  const assetHoldingInitialValue = parseNumeric(assetPosition?.initialValue);
  const assetMeanHoldingValue = parseNumeric(assetPosition?.meanFinalValue);
  const assetStdHoldingValue = parseNumeric(assetPosition?.stdFinalValue);
  const assetVar95HoldingValue = parseNumeric(assetPosition?.var95FinalValue);
  const assetCvar95HoldingValue = parseNumeric(assetPosition?.cvar95FinalValue);
  const assetModalOpen = Boolean(analysisModalState?.isOpen);
  const analysisModalOnClose = analysisModalState?.onClose || (() => {});

  return (
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
        <nav className="dashboard-tabs" aria-label="Dashboard sections" role="tablist">
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
                onClick={() => onSelect(tab.key)}
                onKeyDown={onKeyDown}
                tabIndex={isActive ? 0 : -1}
              >
                <span className="dashboard-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </nav>

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
              <div className="analysis-header">
                <div>
                  <h3>Monte Carlo analysis</h3>
                  <p>Project potential outcomes for your portfolio and individual holdings.</p>
                </div>
                <button
                  className="auth-button"
                  type="button"
                  onClick={() => onRunPortfolioSimulation?.()}
                  disabled={!hasAnalysisHoldings || portfolioSimulationState.loading}
                >
                  {portfolioSimulationState.loading ? 'Running…' : 'Re-run portfolio simulation'}
                </button>
              </div>

              {!hasAnalysisHoldings ? (
                <p className="analysis-empty">
                  Connect an investment account with holdings to run the Monte Carlo analysis.
                </p>
              ) : (
                <>
                  {portfolioSimulationState.error ? (
                    <p className="dashboard-error">{portfolioSimulationState.error}</p>
                  ) : null}

                  <div className="analysis-grid">
                    <article className="analysis-card">
                      <span className="analysis-label">Current portfolio value</span>
                      <span className="analysis-value">
                        {portfolioInitialValue !== null
                          ? formatCurrency(portfolioInitialValue, holdingsSummaryCurrency)
                          : '—'}
                      </span>
                      {portfolioRunTimestamp ? (
                        <span className="analysis-meta">Last run {portfolioRunTimestamp}</span>
                      ) : null}
                    </article>
                    <article className="analysis-card">
                      <span className="analysis-label">Projected mean value</span>
                      <span className="analysis-value">
                        {portfolioMeanFinalValue !== null
                          ? formatCurrency(portfolioMeanFinalValue, holdingsSummaryCurrency)
                          : '—'}
                      </span>
                      <span className="analysis-meta">
                        Std dev{' '}
                        {portfolioStdFinalValue !== null
                          ? formatCurrency(portfolioStdFinalValue, holdingsSummaryCurrency)
                          : '—'}
                      </span>
                    </article>
                    <article className="analysis-card">
                      <span className="analysis-label">Expected return</span>
                      <span className="analysis-value">
                        {portfolioExpectedReturn !== null
                          ? formatPercentChange(portfolioExpectedReturn)
                          : '—'}
                      </span>
                      {portfolioAssetCount ? (
                        <span className="analysis-meta">{portfolioAssetCount} assets modeled</span>
                      ) : null}
                    </article>
                    <article className="analysis-card">
                      <span className="analysis-label">5% VaR / CVaR</span>
                      <span className="analysis-value">
                        {portfolioVar95FinalValue !== null
                          ? formatCurrency(portfolioVar95FinalValue, holdingsSummaryCurrency)
                          : '—'}
                      </span>
                      <span className="analysis-meta">
                        ES{' '}
                        {portfolioCvar95FinalValue !== null
                          ? formatCurrency(portfolioCvar95FinalValue, holdingsSummaryCurrency)
                          : '—'}
                      </span>
                    </article>
                  </div>

                  <div className="analysis-meta-row">
                    {portfolioPathCount ? (
                      <span>{portfolioPathCount.toLocaleString()} simulated paths</span>
                    ) : null}
                    {portfolioSimulationState.params?.n_steps ? (
                      <span>{portfolioSimulationState.params.n_steps} time steps</span>
                    ) : null}
                    {portfolioSimulationState.loading ? <span>Running…</span> : null}
                  </div>

                  <section className="analysis-assets" aria-label="Asset stress tests">
                    <div className="analysis-assets-header">
                      <div>
                        <h4>Asset stress tests</h4>
                        <p>Select a holding to run a dedicated Monte Carlo simulation.</p>
                      </div>
                    </div>
                    <div className="analysis-asset-grid">
                      {analysisHoldingsList.map((holding) => (
                        <button
                          type="button"
                          key={holding.securityId || `${holding.name}-${holding.value}`}
                          className="analysis-asset-card"
                          onClick={() => onSelectAssetSimulation?.(holding)}
                        >
                          <div className="analysis-asset-card-header">
                            <div className="analysis-asset-card-title">
                              <span className="analysis-asset-name">{holding.name}</span>
                              {holding.ticker ? (
                                <span className="analysis-asset-ticker">{holding.ticker}</span>
                              ) : null}
                              {holding.accountName ? (
                                <span className="analysis-asset-account">{holding.accountName}</span>
                              ) : null}
                            </div>
                            <span className="analysis-asset-value">
                              {formatCurrency(holding.value, holding.currency)}
                            </span>
                          </div>
                          <div className="analysis-asset-meta">
                            <span>Qty {formatQuantity(holding.quantity)}</span>
                            <span>{formatCurrency(holding.price, holding.currency)} / share</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {assetModalOpen ? (
                <div className="analysis-modal-overlay" role="dialog" aria-modal="true">
                  <div className="analysis-modal-card">
                    <div className="analysis-modal-header">
                      <div>
                        <h4>{assetSimulationState?.asset?.name || 'Asset simulation'}</h4>
                        {assetSimulationState?.asset?.ticker ? (
                          <span className="analysis-asset-ticker">
                            {assetSimulationState.asset.ticker}
                          </span>
                        ) : null}
                      </div>
                      <button type="button" className="analysis-modal-close" onClick={analysisModalOnClose}>
                        Close
                      </button>
                    </div>

                    {assetSimulationState.loading ? (
                      <p>Running asset simulation…</p>
                    ) : assetSimulationState.error ? (
                      <p className="dashboard-error">{assetSimulationState.error}</p>
                    ) : assetSimData ? (
                      <>
                        <div className="analysis-grid">
                          <article className="analysis-card">
                            <span className="analysis-label">Price today</span>
                            <span className="analysis-value">
                              {assetPrice !== null
                                ? formatCurrency(assetPrice, assetCurrency)
                                : '—'}
                            </span>
                            {assetQuantity !== null ? (
                              <span className="analysis-meta">
                                Qty {formatQuantity(assetQuantity)}
                              </span>
                            ) : null}
                          </article>
                          <article className="analysis-card">
                            <span className="analysis-label">Mean final price</span>
                            <span className="analysis-value">
                              {assetMeanFinalPrice !== null
                                ? formatCurrency(assetMeanFinalPrice, assetCurrency)
                                : '—'}
                            </span>
                            <span className="analysis-meta">
                              Std dev{' '}
                              {assetStdFinalPrice !== null
                                ? formatCurrency(assetStdFinalPrice, assetCurrency)
                                : '—'}
                            </span>
                          </article>
                          <article className="analysis-card">
                            <span className="analysis-label">Expected return</span>
                            <span className="analysis-value">
                              {assetExpectedReturn !== null
                                ? formatPercentChange(assetExpectedReturn)
                                : '—'}
                            </span>
                            {assetRunTimestamp ? (
                              <span className="analysis-meta">Last run {assetRunTimestamp}</span>
                            ) : null}
                          </article>
                          <article className="analysis-card">
                            <span className="analysis-label">5% VaR / CVaR (share)</span>
                            <span className="analysis-value">
                              {assetVar95Price !== null
                                ? formatCurrency(assetVar95Price, assetCurrency)
                                : '—'}
                            </span>
                            <span className="analysis-meta">
                              ES{' '}
                              {assetCvar95Price !== null
                                ? formatCurrency(assetCvar95Price, assetCurrency)
                                : '—'}
                            </span>
                          </article>
                        </div>

                        {assetHoldingInitialValue !== null ? (
                          <div className="analysis-grid analysis-grid--compact">
                            <article className="analysis-card">
                              <span className="analysis-label">Position value</span>
                              <span className="analysis-value">
                                {formatCurrency(assetHoldingInitialValue, assetCurrency)}
                              </span>
                            </article>
                            <article className="analysis-card">
                              <span className="analysis-label">Projected value</span>
                              <span className="analysis-value">
                                {assetMeanHoldingValue !== null
                                  ? formatCurrency(assetMeanHoldingValue, assetCurrency)
                                  : '—'}
                              </span>
                              <span className="analysis-meta">
                                Std dev{' '}
                                {assetStdHoldingValue !== null
                                  ? formatCurrency(assetStdHoldingValue, assetCurrency)
                                  : '—'}
                              </span>
                            </article>
                            <article className="analysis-card">
                              <span className="analysis-label">VaR / CVaR (position)</span>
                              <span className="analysis-value">
                                {assetVar95HoldingValue !== null
                                  ? formatCurrency(assetVar95HoldingValue, assetCurrency)
                                  : '—'}
                              </span>
                              <span className="analysis-meta">
                                ES{' '}
                                {assetCvar95HoldingValue !== null
                                  ? formatCurrency(assetCvar95HoldingValue, assetCurrency)
                                  : '—'}
                              </span>
                            </article>
                          </div>
                        ) : null}

                        <div className="analysis-meta-row">
                          {assetPathCount ? (
                            <span>{assetPathCount.toLocaleString()} simulated paths</span>
                          ) : null}
                          {assetSimulationState.runAt ? (
                            <span>Last run {assetRunTimestamp}</span>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p>Select a holding to view its Monte Carlo simulation.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
