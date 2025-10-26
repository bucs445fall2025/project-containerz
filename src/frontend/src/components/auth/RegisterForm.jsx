import { Link } from 'react-router-dom';

export default function RegisterForm({
  formState,
  error,
  submitting,
  onChange,
  onSubmit
}) {
  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={onSubmit} noValidate>
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
            onChange={onChange}
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
            autoComplete="new-password"
            required
            value={formState.password}
            onChange={onChange}
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
