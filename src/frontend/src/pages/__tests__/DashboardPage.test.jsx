import { render, screen } from '@testing-library/react';
import DashboardView from '../../components/dashboard/DashboardView.jsx';
import DashboardPage from '../Dashboard.jsx';
import { useDashboard } from '../../hooks/useDashboard.js';

jest.mock('../../components/dashboard/DashboardView.jsx', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="dashboard-view" />)
}));

jest.mock('../../hooks/useDashboard.js', () => ({
  useDashboard: jest.fn()
}));

describe('DashboardPage', () => {
  beforeEach(() => {
    DashboardView.mockClear();
    useDashboard.mockReset();
  });

  // Ensure the page renders DashboardView using the data returned from the dashboard hook.
  it('renders DashboardView with the data returned by useDashboard', () => {
    const hookResult = { user: { id: 'user-1' }, accounts: {}, transactions: {} };
    useDashboard.mockReturnValue(hookResult);

    render(<DashboardPage />);

    expect(DashboardView).toHaveBeenCalledWith(expect.objectContaining(hookResult), {});
    expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
  });
});
