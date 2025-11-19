import { act, renderHook } from '@testing-library/react';
import { useForgotPassword } from '../useForgotPassword.js';
import { sendForgotPasswordCode, verifyForgotPasswordCode } from '../../api/auth.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

jest.mock('../../api/auth.js', () => ({
  sendForgotPasswordCode: jest.fn(),
  verifyForgotPasswordCode: jest.fn()
}));

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

describe('useForgotPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function mockAuth(overrides = {}) {
    const defaultAuth = {
      user: null,
      loading: false
    };
    useAuth.mockReturnValue({ ...defaultAuth, ...overrides });
    const navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    return { navigateMock };
  }

  // Check that updating the email field toggles request eligibility.
  it('updates email state and enables request submission when populated', () => {
    mockAuth();
    const { result } = renderHook(() => useForgotPassword());

    act(() => {
      result.current.handleEmailChange('user@example.com');
    });

    expect(result.current.email).toBe('user@example.com');
    expect(result.current.canSubmitRequest).toBe(true);
  });

  // Ensure blank email submissions surface validation messaging and skip the API.
  it('validates email presence before requesting a reset code', async () => {
    mockAuth();
    const { result } = renderHook(() => useForgotPassword());

    await act(async () => {
      await result.current.handleRequestCode({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe('Email is required to send a reset code.');
    expect(sendForgotPasswordCode).not.toHaveBeenCalled();
  });

  // Confirm successful code requests trigger the verification step and success message.
  it('requests a reset code and advances to verification on success', async () => {
    mockAuth();
    sendForgotPasswordCode.mockResolvedValue(undefined);
    const { result } = renderHook(() => useForgotPassword());

    act(() => {
      result.current.handleEmailChange(' user@example.com ');
    });

    await act(async () => {
      await result.current.handleRequestCode({ preventDefault: () => {} });
    });

    expect(sendForgotPasswordCode).toHaveBeenCalledWith('user@example.com');
    expect(result.current.step).toBe('verify');
    expect(result.current.success).toMatch(/we sent a verification code/i);
    expect(result.current.requestingCode).toBe(false);
  });

  // Verify mismatched passwords block verification and surface feedback.
  it('validates matching passwords before verification', async () => {
    mockAuth();
    const { result } = renderHook(() => useForgotPassword());

    act(() => {
      result.current.handleEmailChange('user@example.com');
      result.current.handleCodeChange('123456');
      result.current.handleNewPasswordChange('Secret1!');
      result.current.handleConfirmPasswordChange('Secret2!');
    });

    await act(async () => {
      await result.current.handleVerifyCode({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe('New password and confirmation do not match.');
    expect(verifyForgotPasswordCode).not.toHaveBeenCalled();
  });

  // Ensure a successful verification clears state, refreshes auth, and navigates to login.
  it('verifies the reset code, shows success, and navigates to login', async () => {
    jest.useFakeTimers();
    const { navigateMock } = mockAuth();
    verifyForgotPasswordCode.mockResolvedValue(undefined);
    const { result } = renderHook(() => useForgotPassword());

    act(() => {
      result.current.handleEmailChange('user@example.com');
      result.current.handleCodeChange('123456');
      result.current.handleNewPasswordChange('Secret1!');
      result.current.handleConfirmPasswordChange('Secret1!');
    });

    await act(async () => {
      await result.current.handleVerifyCode({ preventDefault: () => {} });
    });

    expect(verifyForgotPasswordCode).toHaveBeenCalledWith({
      email: 'user@example.com',
      code: '123456',
      newPassword: 'Secret1!'
    });
    expect(result.current.success).toMatch(/password updated/i);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true, state: { passwordReset: true } });
    jest.useRealTimers();
  });

  // Confirm authenticated users are redirected away from the flow.
  it('redirects to the dashboard when a user is already authenticated', () => {
    const { navigateMock } = mockAuth({ user: { id: 'user-1' }, loading: false });

    renderHook(() => useForgotPassword());

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
