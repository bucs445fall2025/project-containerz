import { act, renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext.jsx';
import { getCurrentUser, signOut as signOutRequest } from '../../api/auth.js';

jest.mock('../../api/auth.js', () => ({
  getCurrentUser: jest.fn(),
  signOut: jest.fn()
}));

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

async function renderAuthHook() {
  let rendered;
  await act(async () => {
    rendered = renderHook(() => useAuth(), { wrapper });
    await flushPromises();
  });
  return rendered;
}

let consoleErrorSpy;

describe('AuthContext', () => {
  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ user: null });
    signOutRequest.mockResolvedValue(undefined);
  });

  // Verify the guard prevents consumers from using the hook outside the provider.
  it('throws when useAuth is called outside the provider', () => {
    expect(() => renderHook(() => useAuth())).toThrowError(
      /useAuth must be used inside AuthProvider/i
    );
  });

  // Ensure stored tokens bootstrap user state via getCurrentUser.
  it('bootstraps an existing session from localStorage', async () => {
    localStorage.setItem('authToken', 'token-123');
    getCurrentUser.mockResolvedValueOnce({ user: { id: 'user-1' } });

    const { result } = await renderAuthHook();

    expect(result.current.loading).toBe(false);
    expect(getCurrentUser).toHaveBeenCalledWith('token-123');
    expect(result.current.token).toBe('token-123');
    expect(result.current.user).toEqual({ id: 'user-1' });
  });

  // Confirm login persists credentials and updates context state.
  it('login persists token and user state', async () => {
    const { result } = await renderAuthHook();
    act(() => {
      result.current.login('new-token', { id: 'user-2' });
    });

    expect(localStorage.getItem('authToken')).toBe('new-token');
    expect(result.current.token).toBe('new-token');
    expect(result.current.user).toEqual({ id: 'user-2' });
  });

  // Verify logout hits the API, clears storage, and resets context values.
  it('logout calls the API, clears storage, and resets state', async () => {
    const { result } = await renderAuthHook();
    act(() => {
      result.current.login('active-token', { id: 'user-3' });
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(signOutRequest).toHaveBeenCalledWith('active-token');
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
