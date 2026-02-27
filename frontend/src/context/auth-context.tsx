// context/auth-context.tsx — Global authentication state.
//
// Wraps the app and exposes the current user, a loading flag, and
// setUser so login/register/logout can update state after their
// API calls resolve.
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { ApiError, getMe } from '@serve/services/auth';
import type { User } from '@serve/types/global';

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  sessionError: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    // On mount, check whether a valid session already exists.
    // Only a 401/403 means the user is unauthenticated — network errors
    // and 5xx responses are surfaced via sessionError so the app can
    // show a retry state rather than silently redirecting to /login.
    getMe()
      .then(setUser)
      .catch(err => {
        if (err instanceof ApiError && err.isUnauthorized) {
          setUser(null);
        } else {
          setSessionError(true);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, sessionError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
