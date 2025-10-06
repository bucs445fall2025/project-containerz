import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Hello {user?.name ?? 'there'}!</h1>
          <p className="dashboard-subtitle">This is your dashboard home.</p>
        </div>
        <button className="auth-button" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </header>

      <section className="dashboard-body">
        <p>Your account balances will be shown here.</p>
      </section>
    </div>
  );
}
