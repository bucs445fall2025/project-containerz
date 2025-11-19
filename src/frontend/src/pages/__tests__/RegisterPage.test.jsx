import { render, screen } from '@testing-library/react';
import RegisterForm from '../../components/auth/RegisterForm.jsx';
import RegisterPage from '../Register.jsx';
import { useRegisterForm } from '../../hooks/useRegisterForm.js';

jest.mock('../../components/auth/RegisterForm.jsx', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="register-form" />)
}));

jest.mock('../../hooks/useRegisterForm.js', () => ({
  useRegisterForm: jest.fn()
}));

describe('RegisterPage', () => {
  beforeEach(() => {
    RegisterForm.mockClear();
    useRegisterForm.mockReset();
  });

  // Confirm the page shows a loading indicator when the auth hook reports pending state.
  it('shows a loading indicator while the session state is loading', () => {
    useRegisterForm.mockReturnValue({
      user: null,
      loading: true
    });

    render(<RegisterPage />);

    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
    expect(RegisterForm).not.toHaveBeenCalled();
  });

  // Verify the page passes through hook-provided props to the RegisterForm component.
  it('delegates rendering to RegisterForm with hook-provided props', () => {
    const hookResult = {
      user: null,
      loading: false,
      formState: { name: 'Jane Doe', email: 'jane@example.com', password: 'Secret1!' },
      submitting: false,
      error: 'Test error',
      handleChange: jest.fn(),
      handleSubmit: jest.fn()
    };
    useRegisterForm.mockReturnValue(hookResult);

    render(<RegisterPage />);

    expect(RegisterForm).toHaveBeenCalledWith(
      expect.objectContaining({
        formState: hookResult.formState,
        submitting: hookResult.submitting,
        error: hookResult.error,
        onChange: hookResult.handleChange,
        onSubmit: hookResult.handleSubmit
      }),
      {}
    );
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
  });
});
