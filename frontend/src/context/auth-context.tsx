import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { User } from '@serve/types/global';
import { ApiError, getMe } from '@services/auth';

interface AuthContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  sessionError: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
  // When provided, skips getMe() and uses this value directly.
  // Intended for Storybook and tests only.
  value?: AuthContextValue;
}

export function AuthProvider({ children, value }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(value?.user ?? null);
  const [isLoading, setIsLoading] = useState(value ? false : true);
  const [sessionError, setSessionError] = useState(value?.sessionError ?? false);

  // Capture whether a value was injected at mount time. Using a ref avoids
  // adding `value` to the useEffect dependency array, which would cause
  // infinite re-renders since the object reference changes on every render.
  const isInjected = useRef(!!value);

  useEffect(() => {
    if (isInjected.current) return;

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
