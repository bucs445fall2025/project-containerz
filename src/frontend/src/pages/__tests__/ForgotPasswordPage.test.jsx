import { render, screen } from '@testing-library/react';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm.jsx';
import ForgotPasswordPage from '../ForgotPassword.jsx';
import { useForgotPassword } from '../../hooks/useForgotPassword.js';

jest.mock('../../components/auth/ForgotPasswordForm.jsx', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="forgot-password-form" />)
}));

jest.mock('../../hooks/useForgotPassword.js', () => ({
  useForgotPassword: jest.fn()
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    ForgotPasswordForm.mockClear();
    useForgotPassword.mockReset();
  });

  // Confirm the page surfaces a loading message while auth state initializes.
  it('shows a loading indicator while the session state is loading', () => {
    useForgotPassword.mockReturnValue({
      user: null,
      loading: true
    });

    render(<ForgotPasswordPage />);

    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
    expect(ForgotPasswordForm).not.toHaveBeenCalled();
  });

  // Verify all hook-derived values are forwarded to the ForgotPasswordForm component.
  it('renders the forgot password form with hook-derived props', () => {
    const hookResult = {
      user: null,
      loading: false,
      email: 'user@example.com',
      code: '123456',
      newPassword: 'Secret1!',
      confirmPassword: 'Secret1!',
      step: 'verify',
      error: 'Code mismatch',
      success: '',
      requestingCode: false,
      verifyingCode: true,
      canSubmitRequest: true,
      canSubmitVerify: false,
      handleEmailChange: jest.fn(),
      handleCodeChange: jest.fn(),
      handleNewPasswordChange: jest.fn(),
      handleConfirmPasswordChange: jest.fn(),
      handleRequestCode: jest.fn(),
      handleVerifyCode: jest.fn()
    };
    useForgotPassword.mockReturnValue(hookResult);

    render(<ForgotPasswordPage />);

    expect(ForgotPasswordForm).toHaveBeenCalledWith(
      expect.objectContaining({
        step: hookResult.step,
        email: hookResult.email,
        code: hookResult.code,
        newPassword: hookResult.newPassword,
        confirmPassword: hookResult.confirmPassword,
        error: hookResult.error,
        success: hookResult.success,
        requestingCode: hookResult.requestingCode,
        verifyingCode: hookResult.verifyingCode,
        canSubmitRequest: hookResult.canSubmitRequest,
        canSubmitVerify: hookResult.canSubmitVerify,
        onEmailChange: hookResult.handleEmailChange,
        onCodeChange: hookResult.handleCodeChange,
        onNewPasswordChange: hookResult.handleNewPasswordChange,
        onConfirmPasswordChange: hookResult.handleConfirmPasswordChange,
        onRequestCode: hookResult.handleRequestCode,
        onVerifyCode: hookResult.handleVerifyCode
      }),
      {}
    );
    expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument();
  });
});
