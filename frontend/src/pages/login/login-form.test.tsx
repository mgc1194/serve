import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '@serve/context/auth-context';
import { LoginForm } from '@serve/pages/login/login-form';
import { login, ApiError } from '@serve/services/auth';

vi.mock('@serve/context/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@serve/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@serve/services/auth')>();
  return { ...actual, login: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuth);
const mockLogin = vi.mocked(login);


function setup() {
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    sessionError: false,
    setUser: vi.fn(),
  });
  render(<MemoryRouter><LoginForm /></MemoryRouter>);
}

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    setup();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
  });

  it('renders the sign in button', () => {
    setup();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDefined();
  });

  it('disables the button while submitting', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser: vi.fn() });
    mockLogin.mockReturnValue(new Promise(() => {}));

    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /signing in/i }).hasAttribute('disabled')).toBe(true),
    );
  });

  it('shows error message on failed login', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser: vi.fn() });
    mockLogin.mockRejectedValueOnce(new ApiError(401, 'Invalid credentials'));

    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeDefined();
  });

  it('calls setUser and navigates on successful login', async () => {
    const setUser = vi.fn();
    const user = { id: 1, email: 'a@b.com', username: 'a', first_name: 'A', last_name: 'B', households: [] };
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser });
    mockLogin.mockResolvedValueOnce(user);

    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(setUser).toHaveBeenCalledWith(user));
  });
});
