import { Link } from 'react-router-dom';

export default function ForgotPasswordForm({
  step,
  email,
  code,
  newPassword,
  confirmPassword,
  error,
  success,
  requestingCode,
  verifyingCode,
  canSubmitRequest,
  canSubmitVerify,
  onEmailChange,
  onCodeChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onRequestCode,
  onVerifyCode
}) {
  const isRequestStep = step === 'request';
  const buttonDisabled = isRequestStep ? !canSubmitRequest : !canSubmitVerify;
  const buttonLabel = isRequestStep
    ? requestingCode
      ? 'Sending code…'
      : 'Send reset code'
    : verifyingCode
    ? 'Updating password…'
    : 'Update password';

  const handleSubmit = isRequestStep ? onRequestCode : onVerifyCode;

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Reset your password</h1>
        <p className="auth-subtitle">
          {isRequestStep
            ? 'Enter the email associated with your account and we will send you a reset code.'
            : 'Enter the code from your email and choose a new password.'}
        </p>

        <label className="auth-label" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            className="auth-input"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            disabled={!isRequestStep}
          />
        </label>

        {!isRequestStep ? (
          <>
            <label className="auth-label" htmlFor="reset-code">
              Verification code
              <input
                id="reset-code"
                name="reset-code"
                type="text"
                className="auth-input"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="6-digit code"
                required
                value={code}
                onChange={(event) => onCodeChange(event.target.value)}
              />
            </label>

            <label className="auth-label" htmlFor="new-password">
              New password
              <input
                id="new-password"
                name="new-password"
                type="password"
                className="auth-input"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
              />
            </label>

            <label className="auth-label" htmlFor="confirm-password">
              Confirm new password
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                className="auth-input"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
              />
            </label>
          </>
        ) : null}

        {error ? <div className="auth-error">{error}</div> : null}
        {success ? <div className="auth-success">{success}</div> : null}

        <button className="auth-button" type="submit" disabled={buttonDisabled}>
          {buttonLabel}
        </button>

        <p className="auth-footer">
          Remembered your password? <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
