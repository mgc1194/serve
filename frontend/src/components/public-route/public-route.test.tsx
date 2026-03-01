import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { PublicRoute } from '@serve/components/public-route';
import { useAuth } from '@serve/context/auth-context';

vi.mock('@serve/context/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockUseAuth = vi.mocked(useAuth);

describe('PublicRoute', () => {
  it('renders nothing while loading', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true, sessionError: false, setUser: vi.fn() });

    const { container } = render(
      <MemoryRouter><PublicRoute><p>Public</p></PublicRoute></MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders children when unauthenticated', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: false, setUser: vi.fn() });

    render(
      <MemoryRouter><PublicRoute><p>Public</p></PublicRoute></MemoryRouter>,
    );

    expect(screen.getByText('Public')).toBeDefined();
  });

  it('redirects to / when authenticated', () => {
    const user = { id: 1, email: 'a@b.com', username: 'a', first_name: 'A', last_name: 'B', households: [] };
    mockUseAuth.mockReturnValue({ user, isLoading: false, sessionError: false, setUser: vi.fn() });

    render(
      <MemoryRouter><PublicRoute><p>Public</p></PublicRoute></MemoryRouter>,
    );

    expect(screen.queryByText('Public')).toBeNull();
  });

  it('shows warning but renders children on sessionError', () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: false, sessionError: true, setUser: vi.fn() });

    render(
      <MemoryRouter><PublicRoute><p>Public</p></PublicRoute></MemoryRouter>,
    );

    expect(screen.getByText(/unable to reach the server/i)).toBeDefined();
    expect(screen.getByText('Public')).toBeDefined();
  });
});
