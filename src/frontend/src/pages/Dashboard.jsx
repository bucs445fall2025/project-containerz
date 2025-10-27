import DashboardView from '../components/dashboard/DashboardView.jsx';
import { useDashboard } from '../hooks/useDashboard.js';

export default function DashboardPage() {
  const dashboard = useDashboard();
  return <DashboardView {...dashboard} />;
}
