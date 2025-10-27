import { act, renderHook, waitFor } from '@testing-library/react';
import { useDashboard } from '../useDashboard.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { usePlaidLink } from 'react-plaid-link';
import {
  createLinkToken,
  fetchAccounts,
  fetchInvestments,
  fetchTransactions,
  setAccessToken
} from '../../api/plaid.js';
import { sendVerificationCode, verifyVerificationCode } from '../../api/auth.js';

jest.mock('../../context/AuthContext.jsx', () => ({
  __esModule: true,
  useAuth: jest.fn()
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: jest.fn()
  };
});

jest.mock('react-plaid-link', () => ({
  usePlaidLink: jest.fn()
}));

jest.mock('../../api/plaid.js', () => ({
  createLinkToken: jest.fn(),
  fetchAccounts: jest.fn(),
  fetchInvestments: jest.fn(),
  fetchTransactions: jest.fn(),
  setAccessToken: jest.fn()
}));

jest.mock('../../api/auth.js', () => ({
  sendVerificationCode: jest.fn(),
  verifyVerificationCode: jest.fn()
}));

const noop = () => {};

describe('useDashboard', () => {
  const logout = jest.fn(() => Promise.resolve());
  const refreshUser = jest.fn(() => Promise.resolve());
  const navigate = jest.fn();
  const plaidOpen = jest.fn();
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      user: { email: 'user@example.com', verified: false },
      token: 'token-123',
      logout,
      refreshUser
    });
    useNavigate.mockReturnValue(navigate);
    usePlaidLink.mockReturnValue({ open: plaidOpen, ready: true, error: null });
    createLinkToken.mockResolvedValue({ link_token: 'link-token' });
    fetchAccounts.mockResolvedValue({ accounts: [] });
    fetchInvestments.mockResolvedValue({ investments: [] });
    fetchTransactions.mockResolvedValue({ transactions: [] });
    setAccessToken.mockResolvedValue(undefined);
    sendVerificationCode.mockResolvedValue(undefined);
    verifyVerificationCode.mockResolvedValue(undefined);

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(noop);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(noop);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // Ensure the hook initializes Plaid link and account data when mounted.
  it('bootstraps Plaid link token on mount', async () => {
    renderHook(() => useDashboard());

    await waitFor(() => {
      expect(createLinkToken).toHaveBeenCalledWith('token-123');
    });
    expect(fetchAccounts).toHaveBeenCalledWith('token-123');
  });

  // Confirm signing out delegates to auth context and routes back to login.
  it('signs out via auth context and navigates to login', async () => {
    const { result } = renderHook(() => useDashboard());

    await act(async () => {
      await result.current.signOut();
    });

    expect(logout).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  // Verify requesting a verification code opens the modal and updates status flags.
  it('sends a verification code and updates status', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.verification.status.sending).toBe(false));

    await act(async () => {
      await result.current.verification.onSend();
    });

    expect(sendVerificationCode).toHaveBeenCalledWith('token-123', 'user@example.com');
    expect(result.current.verification.isOpen).toBe(true);
    expect(result.current.verification.hasRequestedCode).toBe(true);
    expect(result.current.verification.status.success).toMatch(/code sent/i);
  });

  // Ensure successfully verifying a code refreshes the user and reloads the app.
  it('verifies a code, refreshes the user, and reloads the page', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.verification.status.sending).toBe(false));

    act(() => {
      result.current.verification.onCodeChange('123456');
    });

    await act(async () => {
      await result.current.verification.onVerify({ preventDefault: noop });
    });

    expect(verifyVerificationCode).toHaveBeenCalledWith('token-123', {
      email: 'user@example.com',
      code: '123456'
    });
    expect(refreshUser).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(0);
    expect(result.current.verification.status.success).toMatch(/verified/i);
    expect(result.current.verification.code).toBe('');
  });

  // Confirm the Plaid connect handler opens the Link flow when ready.
  it('opens Plaid Link when connect is triggered and ready', async () => {
    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      result.current.link.onConnect();
      expect(plaidOpen).toHaveBeenCalled();
    });
  });

  // Validate formatter helpers handle numeric, null, and fallback scenarios gracefully.
  it('provides currency and account formatter helpers with sensible fallbacks', () => {
    const { result } = renderHook(() => useDashboard());
    const { formatCurrency, formatSignedCurrency, formatAccountType } = result.current.formatters;

    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    expect(formatCurrency(null, 'USD')).toBe('—');
    expect(formatCurrency(500, 'INVALID_CODE')).toBe('$500');

    expect(formatSignedCurrency(0, 'USD')).toBe('$0.00');
    expect(formatSignedCurrency(42, 'USD')).toBe('+$42.00');
    expect(formatSignedCurrency(-42, 'USD')).toBe('-$42.00');

    expect(formatAccountType({ subtype: 'student_checking' })).toBe('Student Checking');
    expect(formatAccountType({ type: 'credit_card' })).toBe('Credit Card');
    expect(formatAccountType({})).toBe('');
  });

  // Ensure only the first ten investment transactions are exposed to the view layer.
  it('limits displayed investment transactions to the first 10 results', async () => {
    const investmentTransactions = Array.from({ length: 12 }, (_, index) => ({
      investment_transaction_id: `txn-${index}`,
      amount: index + 1
    }));
    fetchInvestments.mockResolvedValueOnce({ investments_transactions: investmentTransactions });

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => expect(result.current.tabs.active).toBe('balances'));

    await act(async () => {
      result.current.tabs.onSelect('investments');
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(fetchInvestments).toHaveBeenCalledWith('token-123');
      expect(result.current.investments.transactions).toHaveLength(12);
    });

    expect(result.current.investments.displayedTransactions).toHaveLength(10);
    expect(result.current.investments.displayedTransactions[0]).toEqual(investmentTransactions[0]);
    expect(result.current.investments.displayedTransactions[9]).toEqual(investmentTransactions[9]);
  });
});
