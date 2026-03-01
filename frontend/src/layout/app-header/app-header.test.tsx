import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '@serve/context/auth-context';
import { AppHeader } from '@serve/layout/app-header';
import { logout } from '@serve/services/auth';

vi.mock('@serve/context/auth-context', () => ({ useAuth: vi.fn() }));
vi.mock('@serve/services/auth', () => ({ logout: vi.fn() }));


const mockUseAuth = vi.mocked(useAuth);
const mockLogout = vi.mocked(logout);

const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  households: [],
};

describe('AppHeader', () => {
  it('renders the logo', () => {
    mockUseAuth.mockReturnValue({ user: mockUser, isLoading: false, sessionError: false, setUser: vi.fn() });

    render(<MemoryRouter><AppHeader /></MemoryRouter>);

    expect(screen.getByAltText('SERVE')).toBeDefined();
  });

  it("renders the user's email", () => {
    mockUseAuth.mockReturnValue({ user: mockUser, isLoading: false, sessionError: false, setUser: vi.fn() });

    render(<MemoryRouter><AppHeader /></MemoryRouter>);

    expect(screen.getByText(mockUser.email)).toBeDefined();
  });

  it('calls logout on sign out click', async () => {
    const setUser = vi.fn();
    mockUseAuth.mockReturnValue({ user: mockUser, isLoading: false, sessionError: false, setUser });
    mockLogout.mockResolvedValueOnce(undefined);

    render(<MemoryRouter><AppHeader /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await vi.waitFor(() => expect(mockLogout).toHaveBeenCalledOnce());
    expect(setUser).toHaveBeenCalledWith(null);
  });
});