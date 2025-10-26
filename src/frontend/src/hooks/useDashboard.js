import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import { useAuth } from '../context/AuthContext.jsx';
import {
  createLinkToken,
  fetchAccounts,
  fetchInvestments,
  fetchTransactions,
  setAccessToken
} from '../api/plaid.js';
import { sendVerificationCode, verifyVerificationCode } from '../api/auth.js';

const DASHBOARD_TABS = [
  { key: 'balances', label: 'Account Balances' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'investments', label: 'Investments' },
  { key: 'analysis', label: 'Analysis' }
];

const TRANSACTIONS_PER_PAGE = 10;

export function useDashboard() {
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
  const [investmentData, setInvestmentData] = useState(null);
  const [investmentsLoading, setInvestmentsLoading] = useState(false);
  const [investmentsError, setInvestmentsError] = useState(null);
  const [investmentsInitialized, setInvestmentsInitialized] = useState(false);
  const [linkWorking, setLinkWorking] = useState(false);
  const [code, setCode] = useState('');
  const [verificationStatus, setVerificationStatus] = useState({
    sending: false,
    verifying: false,
    error: '',
    success: ''
  });
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
    } catch (sendError) {
      setVerificationStatus((prev) => ({
        ...prev,
        error: sendError.message || 'Unable to send code.'
      }));
    } finally {
      setVerificationStatus((prev) => ({ ...prev, sending: false }));
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    setVerificationStatus((prev) => ({ ...prev, verifying: true, error: '', success: '' }));
    try {
      await verifyVerificationCode(token, { email: user.email, code });
      setVerificationStatus({
        sending: false,
        verifying: false,
        error: '',
        success: 'Verified! Updating your account…'
      });
      setCode('');
      await refreshUser();
      navigate(0);
    } catch (verifyError) {
      setVerificationStatus((prev) => ({
        ...prev,
        error: verifyError.message || 'Invalid or expired code.'
      }));
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
    } catch (accountsError) {
      console.error('Unable to load accounts', accountsError);
      setError(accountsError.message ?? 'Unable to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  }, [token]);

  const loadInvestments = useCallback(async () => {
    if (!token) {
      return;
    }
    setInvestmentsLoading(true);
    setInvestmentsError(null);
    try {
      const response = await fetchInvestments(token);
      const candidate =
        (response?.investments && typeof response.investments === 'object'
          ? response.investments
          : response?.investments_transactions) ?? null;

      if (Array.isArray(candidate)) {
        setInvestmentData({
          accounts: [],
          holdings: [],
          investment_transactions: candidate,
          securities: [],
          as_of: null
        });
      } else if (candidate && typeof candidate === 'object') {
        setInvestmentData({
          ...candidate,
          accounts: Array.isArray(candidate.accounts) ? candidate.accounts : [],
          holdings: Array.isArray(candidate.holdings) ? candidate.holdings : [],
          investment_transactions: Array.isArray(candidate.investment_transactions)
            ? candidate.investment_transactions
            : [],
          securities: Array.isArray(candidate.securities) ? candidate.securities : [],
          as_of: candidate.as_of ?? null
        });
      } else {
        setInvestmentData({
          accounts: [],
          holdings: [],
          investment_transactions: [],
          securities: [],
          as_of: null
        });
      }
    } catch (investmentsLoadError) {
      console.error('Unable to load investments', investmentsLoadError);
      setInvestmentsError(investmentsLoadError.message ?? 'Unable to load investments');
    } finally {
      setInvestmentsLoading(false);
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
      const fetchedTransactions = response.transactions ?? response.latest_transactions ?? [];
      setTransactions(fetchedTransactions);
      setTransactionsPage(1);
    } catch (transactionsLoadError) {
      console.error('Unable to load transactions', transactionsLoadError);
      setTransactionsError(transactionsLoadError.message ?? 'Unable to load transactions');
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
    if (activeTab !== 'investments' || investmentsInitialized || !token) {
      return;
    }
    setInvestmentsInitialized(true);
    loadInvestments();
  }, [activeTab, investmentsInitialized, loadInvestments, token]);

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
      } catch (linkTokenError) {
        console.error('Unable to create link token', linkTokenError);
        if (!cancelled) {
          setError(linkTokenError.message ?? 'Unable to initialize Plaid Link');
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
          setInvestmentsInitialized(false);
          setError(null);
          const response = await createLinkToken(token);
          setLinkToken(response.link_token);
        } catch (setAccessTokenError) {
          console.error('Unable to set Plaid access token', setAccessTokenError);
          setError(setAccessTokenError.message ?? 'Unable to save Plaid access token');
        } finally {
          setLinkWorking(false);
        }
      },
      onExit: (exitError) => {
        if (exitError) {
          setError(
            exitError.display_message || exitError.error_message || 'Plaid Link exited'
          );
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
  const investmentAccounts = Array.isArray(investmentData?.accounts) ? investmentData.accounts : [];
  const investmentHoldings = Array.isArray(investmentData?.holdings) ? investmentData.holdings : [];
  const investmentTransactions = Array.isArray(investmentData?.investment_transactions)
    ? investmentData.investment_transactions
    : [];
  const investmentSecurities = Array.isArray(investmentData?.securities)
    ? investmentData.securities
    : [];
  const hasInvestmentAccounts = investmentAccounts.length > 0;
  const hasInvestmentHoldings = investmentHoldings.length > 0;
  const hasInvestmentTransactions = investmentTransactions.length > 0;
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
    investmentAccounts.forEach((account) => {
      if (account?.account_id && !lookup.has(account.account_id)) {
        lookup.set(account.account_id, account);
      }
    });
    return lookup;
  }, [accounts, investmentAccounts]);

  const securitiesLookup = useMemo(() => {
    const lookup = new Map();
    investmentSecurities.forEach((security) => {
      if (security?.security_id && !lookup.has(security.security_id)) {
        lookup.set(security.security_id, security);
      }
    });
    return lookup;
  }, [investmentSecurities]);

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

  const formatSignedCurrency = (value, currencyCode = 'USD') => {
    if (value === null || value === undefined) {
      return '—';
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return `${value}`;
    }
    if (numericValue === 0) {
      return formatCurrency(0, currencyCode);
    }
    const formatted = formatCurrency(Math.abs(numericValue), currencyCode);
    return `${numericValue > 0 ? '+' : '-'}${formatted}`;
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

  const formatQuantity = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return '—';
    }
    if (Math.abs(numericValue) >= 1000) {
      return numericValue.toLocaleString('en-US', {
        maximumFractionDigits: 2
      });
    }
    return numericValue.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  };

  const formatPercentChange = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }
    const percent = Math.abs(numericValue) <= 1 ? numericValue * 100 : numericValue;
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
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

  const getTransactionBackground = (transaction) => {
    const primary = transaction.personal_finance_category?.primary;
    const confidence = transaction.personal_finance_category?.confidence_level;
    const amount = transaction?.amount;
    const highlightCategories = new Set(['FOOD_AND_DRINK', 'PERSONAL_CARE', 'ENTERTAINMENT']);
    if ((confidence === 'VERY_HIGH' || highlightCategories.has(primary)) && Number(amount) > 0) {
      return '#faafaf';
    }
    return '#fff';
  };

  const totalInvestmentValue = useMemo(
    () =>
      investmentAccounts.reduce((sum, account) => {
        const amount = Number(account?.balances?.current);
        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [investmentAccounts]
  );

  const totalHoldingsValue = useMemo(
    () =>
      investmentHoldings.reduce((sum, holding) => {
        const amount = Number(holding?.institution_value);
        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [investmentHoldings]
  );

  const displayedInvestmentTransactions = useMemo(
    () => investmentTransactions.slice(0, 10),
    [investmentTransactions]
  );

  const investmentSummaryCurrency =
    investmentAccounts[0]?.balances?.iso_currency_code ||
    investmentAccounts[0]?.balances?.unofficial_currency_code ||
    investmentHoldings[0]?.iso_currency_code ||
    investmentHoldings[0]?.unofficial_currency_code ||
    'USD';

  const holdingsSummaryCurrency =
    investmentHoldings[0]?.iso_currency_code ||
    investmentHoldings[0]?.unofficial_currency_code ||
    investmentSummaryCurrency;

  return {
    user,
    isVerified: Boolean(user?.verified),
    signOut: handleSignOut,
    error,
    tabs: {
      active: activeTab,
      definitions: tabDefinitions,
      onSelect: setActiveTab,
      onKeyDown: handleTabKeyDown
    },
    verification: {
      isOpen: verificationOpen,
      status: verificationStatus,
      hasRequestedCode,
      code,
      onCodeChange: setCode,
      onSend: handleSendCode,
      onVerify: handleVerifyCode,
      onToggle: handleToggleVerification
    },
    link: {
      ready,
      working: linkWorking,
      onConnect: handleConnectBank
    },
    accounts: {
      items: accounts,
      loading: accountsLoading,
      hasAny: hasAccounts,
      onRefresh: loadAccounts,
      error
    },
    transactions: {
      items: transactions,
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
      onRefresh: loadTransactions
    },
    investments: {
      accounts: investmentAccounts,
      holdings: investmentHoldings,
      securities: investmentSecurities,
      transactions: investmentTransactions,
      displayedTransactions: displayedInvestmentTransactions,
      loading: investmentsLoading,
      error: investmentsError,
      hasAccounts: hasInvestmentAccounts,
      hasHoldings: hasInvestmentHoldings,
      hasTransactions: hasInvestmentTransactions,
      totals: {
        investmentValue: totalInvestmentValue,
        holdingsValue: totalHoldingsValue
      },
      currencies: {
        summary: investmentSummaryCurrency,
        holdings: holdingsSummaryCurrency
      },
      onRefresh: loadInvestments
    },
    analysis: {
      showBreakdown: showSpendingBreakdown,
      breakdown: spendingBreakdown,
      currency: spendingBreakdownTotalCurrency
    },
    lookups: {
      account: accountLookup,
      security: securitiesLookup
    },
    formatters: {
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
    }
  };
}
