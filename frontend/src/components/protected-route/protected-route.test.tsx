import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { ProtectedRoute } from '@serve/components/protected-route';
import { useAuth } from '@serve/context/auth-context';

vi.mock('@serve/context/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

describe('ProtectedRoute', () => {
  it('renders nothing while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, sessionError: false, setUser: vi.fn() });

    const { container } = render(
      <MemoryRouter><ProtectedRoute><p>Content</p></ProtectedRoute></MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders children when authenticated', () => {
    const user = { id: 1, email: 'a@b.com', username: 'a', first_name: 'A', last_name: 'B', households: [] };
    mockUseAuth.mockReturnValue({ user, isLoading: false, sessionError: false, setUser: vi.fn() });

    render(
      <MemoryRouter><ProtectedRoute><p>Protected</p></ProtectedRoute></MemoryRouter>,
    );

    expect(screen.getByText('Protected')).toBeDefined();
  });

  it('shows error state on sessionError', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: true, setUser: vi.fn() });

    render(
      <MemoryRouter><ProtectedRoute><p>Protected</p></ProtectedRoute></MemoryRouter>,
    );

    expect(screen.getByText(/unable to reach the server/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('redirects to /login when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser: vi.fn() });

    render(
      <MemoryRouter initialEntries={['/']}>
        <ProtectedRoute><p>Protected</p></ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Protected')).toBeNull();
  });
});
