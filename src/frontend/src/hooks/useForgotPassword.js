import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendForgotPasswordCode, verifyForgotPasswordCode } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export function useForgotPassword() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('request');
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
      await verifyForgotPasswordCode({
        email: email.trim(),
        code: normalizedCode,
        newPassword
      });
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

  const canSubmitRequest = Boolean(email.trim()) && !requestingCode;
  const canSubmitVerify =
    Boolean(code.trim() && newPassword && confirmPassword) && !verifyingCode;

  const handleEmailChange = (value) => {
    setEmail(value);
  };

  const handleCodeChange = (value) => {
    setCode(value);
  };

  const handleNewPasswordChange = (value) => {
    setNewPassword(value);
  };

  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
  };

  return {
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
  };
}
