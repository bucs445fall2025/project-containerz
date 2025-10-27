import { act, renderHook } from '@testing-library/react';
import { useRegisterForm } from '../useRegisterForm.js';
import { signUp } from '../../api/auth.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

jest.mock('../../api/auth.js', () => ({
  signUp: jest.fn()
}));

jest.mock('../../context/AuthContext.jsx', () => ({
  __esModule: true,
  useAuth: jest.fn()
}));

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: jest.fn()
  };
});

describe('useRegisterForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockAuth(overrides = {}) {
    const defaultAuth = {
      user: null,
      loading: false,
      login: jest.fn()
    };
    useAuth.mockReturnValue({ ...defaultAuth, ...overrides });
    const navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
    return { navigateMock };
  }

  // Confirm the hook updates local form state when any input handler fires.
  it('updates form state when handleChange is called', () => {
    mockAuth();
    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange({ target: { name: 'name', value: 'Ada' } });
    });

    expect(result.current.formState.name).toBe('Ada');
  });

  // Ensure a successful submission calls the signup API, logs in the user, and redirects.
  it('submits registration data, logs in, and navigates on success', async () => {
    const loginMock = jest.fn();
    const { navigateMock } = mockAuth({ login: loginMock });
    signUp.mockResolvedValue({
      token: 'token-123',
      user: { id: 'user-1' }
    });

    const { result } = renderHook(() => useRegisterForm());

    act(() => {
      result.current.handleChange({ target: { name: 'email', value: 'ada@example.com' } });
      result.current.handleChange({ target: { name: 'name', value: 'Ada' } });
      result.current.handleChange({ target: { name: 'password', value: 'Passw0rd!' } });
    });

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} });
    });

    expect(signUp).toHaveBeenCalledWith({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'Passw0rd!'
    });
    expect(loginMock).toHaveBeenCalledWith('token-123', { id: 'user-1' });
    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
    expect(result.current.submitting).toBe(false);
    expect(result.current.error).toBe('');
  });

  // Verify rejected submissions expose the error message and stop the loading state.
  it('captures and exposes submission errors', async () => {
    const error = new Error('Email already used');
    mockAuth();
    signUp.mockRejectedValue(error);

    const { result } = renderHook(() => useRegisterForm());

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} });
    });

    expect(result.current.error).toBe('Email already used');
    expect(result.current.submitting).toBe(false);
  });

  // Make sure authenticated users are redirected immediately on mount.
  it('redirects to the dashboard when a user session already exists', () => {
    const loginMock = jest.fn();
    const { navigateMock } = mockAuth({ user: { id: 'existing' }, loading: false, login: loginMock });

    renderHook(() => useRegisterForm());

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
