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
  const { showBreakdown, breakdown: spendingBreakdown, currency: spendingBreakdownTotalCurrency } =
    analysis;
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
        </div>
      </section>
    </div>
  );
}
