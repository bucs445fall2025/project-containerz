import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sendForgotPasswordCode, verifyForgotPasswordCode } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request');
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const resetStatus = () => {
    setError('');
    setSuccess('');
  };

  const handleRequestCode = async (event) => {
    event.preventDefault();
    resetStatus();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError('Email is required to send a reset code.');
      return;
    }
    if (normalizedEmail !== email) {
      setEmail(normalizedEmail);
    }
    setRequestingCode(true);
    try {
      await sendForgotPasswordCode(normalizedEmail);
      setSuccess('We sent a verification code to your email. Enter it below to set a new password.');
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Unable to send reset code.');
    } finally {
      setRequestingCode(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();
    resetStatus();

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    const normalizedCode = code.trim();
    if (!normalizedCode || normalizedCode.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setVerifyingCode(true);
    try {
      await verifyForgotPasswordCode({ email: email.trim(), code: normalizedCode, newPassword });
      setSuccess('Password updated! Redirecting to login…');
      timeoutRef.current = setTimeout(() => {
        navigate('/login', { replace: true, state: { passwordReset: true } });
      }, 800);
    } catch (err) {
      setError(err.message || 'Unable to verify reset code.');
    } finally {
      setVerifyingCode(false);
    }
  };

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  if (loading && user === null) {
    return <div className="page-center">Loading session…</div>;
  }

  return (
    <div className="auth-wrapper">
      <form
        className="auth-card"
        onSubmit={step === 'request' ? handleRequestCode : handleVerifyCode}
        noValidate
      >
        <h1>Reset your password</h1>
        <p className="auth-subtitle">
          {step === 'request'
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
            onChange={(event) => setEmail(event.target.value)}
            disabled={step === 'verify'}
          />
        </label>

        {step === 'verify' ? (
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
                onChange={(event) => setCode(event.target.value)}
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
                onChange={(event) => setNewPassword(event.target.value)}
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
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          </>
        ) : null}

        {error ? <div className="auth-error">{error}</div> : null}
        {success ? <div className="auth-success">{success}</div> : null}

        <button
          className="auth-button"
          type="submit"
          disabled={
            (step === 'request' && (requestingCode || !email)) ||
            (step === 'verify' &&
              (verifyingCode || !code || !newPassword || !confirmPassword))
          }
        >
          {step === 'request'
            ? requestingCode
              ? 'Sending code…'
              : 'Send reset code'
            : verifyingCode
            ? 'Updating password…'
            : 'Update password'}
        </button>

        <p className="auth-footer">
          Remembered your password? <Link to="/login">Back to sign in</Link>
        </p>
      </form>
    </div>
  );
}
