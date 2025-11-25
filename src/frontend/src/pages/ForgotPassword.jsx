import ForgotPasswordForm from '../components/auth/ForgotPasswordForm.jsx';
import { useForgotPassword } from '../hooks/useForgotPassword.js';

export default function ForgotPasswordPage() {
  const {
    user,
    loading,
    email,
    code,
    newPassword,
    confirmPassword,
    step,
    error,
    success,
    requestingCode,
    verifyingCode,
    canSubmitRequest,
    canSubmitVerify,
    handleEmailChange,
    handleCodeChange,
    handleNewPasswordChange,
    handleConfirmPasswordChange,
    handleRequestCode,
    handleVerifyCode
  } = useForgotPassword();

  if (loading && user === null) {
    return <div className="page-center">Loading session…</div>;
  }

  return (
    <ForgotPasswordForm
      step={step}
      email={email}
      code={code}
      newPassword={newPassword}
      confirmPassword={confirmPassword}
      error={error}
      success={success}
      requestingCode={requestingCode}
      verifyingCode={verifyingCode}
      canSubmitRequest={canSubmitRequest}
      canSubmitVerify={canSubmitVerify}
      onEmailChange={handleEmailChange}
      onCodeChange={handleCodeChange}
      onNewPasswordChange={handleNewPasswordChange}
      onConfirmPasswordChange={handleConfirmPasswordChange}
      onRequestCode={handleRequestCode}
      onVerifyCode={handleVerifyCode}
    />
  );
}
