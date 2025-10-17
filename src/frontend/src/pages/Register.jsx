import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUp } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await signUp(formState);
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
        <h1>Create your account</h1>
        <p className="auth-subtitle">Join to start managing your finances.</p>

        <label className="auth-label" htmlFor="name">
          Name
          <input
            id="name"
            name="name"
            type="text"
            className="auth-input"
            autoComplete="name"
            required
            value={formState.name}
            onChange={handleChange}
          />
        </label>

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
            autoComplete="new-password"
            required
            value={formState.password}
            onChange={handleChange}
            placeholder="8+ chars with upper, lower, number & symbol"
          />
        </label>

        {error ? <div className="auth-error">{error}</div> : null}

        <button className="auth-button" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
