import RegisterForm from '../components/auth/RegisterForm.jsx';
import { useRegisterForm } from '../hooks/useRegisterForm.js';

export default function RegisterPage() {
  const { user, loading, formState, submitting, error, handleChange, handleSubmit } =
    useRegisterForm();

  if (loading && user === null) {
    return <div className="page-center">Loading session…</div>;
  }

  return (
    <RegisterForm
      formState={formState}
      submitting={submitting}
      error={error}
      onChange={handleChange}
      onSubmit={handleSubmit}
    />
  );
}
