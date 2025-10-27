import { Link } from 'react-router-dom';

export default function LoginForm({ formState, error, submitting, onChange, onSubmit }) {
  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
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
            onChange={onChange}
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
            onChange={onChange}
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
