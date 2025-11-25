import LoginForm from '../components/auth/LoginForm.jsx';
import { useLoginForm } from '../hooks/useLoginForm.js';

export default function LoginPage() {
  const { user, loading, formState, error, submitting, handleChange, handleSubmit } =
    useLoginForm();

  if (loading && user === null) {
    return <div className="page-center">Loading session…</div>;
  }

  return (
    <LoginForm
      formState={formState}
      error={error}
      submitting={submitting}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
