// components/protected-route.tsx — Redirects unauthenticated users to /login.
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '@serve/context/auth-context';


interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
