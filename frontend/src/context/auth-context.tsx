// context/auth-context.tsx — Global authentication state.
//
// Wraps the app and exposes the current user, a loading flag, and
// setUser so login/register/logout can update state after their
// API calls resolve.
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

import { getMe } from '@serve/services/auth';
import type { User } from '@serve/types/global';

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On mount, check whether a valid session already exists.
    // If /auth/me returns a user, restore their session silently.
    // If it returns 401, we leave user as null.
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
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