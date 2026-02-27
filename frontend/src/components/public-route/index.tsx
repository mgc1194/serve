// components/public-route/index.tsx — Redirects authenticated users to /.
//
// Wraps public-only routes (login, register) so that users with an
// active session are sent to the dashboard instead.
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '@serve/context/auth-context';


interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { user, isLoading } = useAuth();

  // Wait for /auth/me to resolve before deciding — avoids a flash
  // redirect on first load when the session check is still in flight.
  if (isLoading) return null;

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}