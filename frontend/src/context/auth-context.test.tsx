import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@serve/context/auth-context';
import { getMe, ApiError } from '@serve/services/auth';

vi.mock('@serve/services/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@serve/services/auth')>();
  return { ...actual, getMe: vi.fn() };
});

const mockGetMe = vi.mocked(getMe);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthProvider', () => {
  it('starts in loading state', () => {
    mockGetMe.mockResolvedValueOnce({} as never);
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it('restores session when getMe resolves', async () => {
    const user = { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B', username: 'ab', households: [] };
    mockGetMe.mockResolvedValueOnce(user);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(user);
    expect(result.current.sessionError).toBe(false);
  });

  it('sets user to null on 401', async () => {
    mockGetMe.mockRejectedValueOnce(new ApiError(401, 'Unauthorized'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.sessionError).toBe(false);
  });

  it('sets user to null on 403', async () => {
    mockGetMe.mockRejectedValueOnce(new ApiError(403, 'Forbidden'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.sessionError).toBe(false);
  });

  it('sets sessionError on 500', async () => {
    mockGetMe.mockRejectedValueOnce(new ApiError(500, 'Server error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.sessionError).toBe(true);
  });

  it('sets sessionError on network failure', async () => {
    mockGetMe.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sessionError).toBe(true);
  });
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
  });
});
