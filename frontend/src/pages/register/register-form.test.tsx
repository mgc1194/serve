import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '@serve/context/auth-context';
import { RegisterForm } from '@serve/pages/register/register-form';
import { register, ApiError } from '@serve/services/auth';

vi.mock('@serve/context/auth-context', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@serve/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@serve/services/auth')>();
  return { ...actual, register: vi.fn() };
});

const mockUseAuth = vi.mocked(useAuth);
const mockRegister = vi.mocked(register);

function setup() {
  mockUseAuth.mockReturnValue({
    user: null,
    isLoading: false,
    sessionError: false,
    setUser: vi.fn(),
  });
  render(<MemoryRouter><RegisterForm /></MemoryRouter>);
}

function fillForm(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}> = {}) {
  const {
    firstName = 'Test',
    lastName = 'User',
    email = 'test@example.com',
    password = 'Password1!Secret',
    confirmPassword = 'Password1!Secret',
  } = overrides;

  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: firstName } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: lastName } });
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: confirmPassword } });
}

describe('RegisterForm', () => {
  it('renders all fields', () => {
    setup();
    expect(screen.getByLabelText(/first name/i)).toBeDefined();
    expect(screen.getByLabelText(/last name/i)).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/^password/i)).toBeDefined();
    expect(screen.getByLabelText(/confirm password/i)).toBeDefined();
  });

  it('renders the create account button', () => {
    setup();
    expect(screen.getByRole('button', { name: /create account/i })).toBeDefined();
  });

  it('disables the button while submitting', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser: vi.fn() });
    mockRegister.mockReturnValue(new Promise(() => {}));

    render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /creating account/i }).hasAttribute('disabled')).toBe(true),
    );
  });

  it('shows error message on failed registration', async () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser: vi.fn() });
    mockRegister.mockRejectedValueOnce(new ApiError(400, 'Email already exists'));

    render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/email already exists/i)).toBeDefined();
  });

  it('calls setUser and navigates on successful registration', async () => {
    const setUser = vi.fn();
    const user = { id: 1, email: 'test@example.com', username: 'test', first_name: 'Test', last_name: 'User', households: [] };
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser });
    mockRegister.mockResolvedValueOnce(user);

    render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    fillForm();
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(setUser).toHaveBeenCalledWith(user));
  });
});
