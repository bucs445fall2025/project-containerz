import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signIn } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectPath = useMemo(() => location.state?.from?.pathname ?? '/dashboard', [location.state]);

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectPath, { replace: true });
    }
  }, [loading, user, navigate, redirectPath]);

  const [formState, setFormState] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await signIn(formState);
      login(response.token, response.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && user === null) {
    return <div className="page-center">Loading session…</div>;
  }

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in to access your dashboard.</p>

        <label className="auth-label" htmlFor="email">
          Email
          <input
            id="email"
            name="email"
            type="email"
            className="auth-input"
            autoComplete="email"
            required
            value={formState.email}
            onChange={handleChange}
          />
        </label>

        <label className="auth-label" htmlFor="password">
          Password
          <input
            id="password"
            name="password"
            type="password"
            className="auth-input"
            autoComplete="current-password"
            required
            value={formState.password}
            onChange={handleChange}
          />
        </label>

        {error ? <div className="auth-error">{error}</div> : null}

        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="auth-footer">
          Need an account? <Link to="/register">Create one</Link>
        </p>
        <p className="auth-footer">
          <Link to="/forgotPass">Forgot your password?</Link>
        </p>
      </form>
    </div>
  );
}
