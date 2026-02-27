// components/public-route/index.tsx — Redirects authenticated users to /.
//
// Wraps public-only routes (login, register) so that users with an
// active session are sent to the dashboard instead.
import { Alert, Box, Button } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '@serve/context/auth-context';

interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { user, isLoading, sessionError } = useAuth();

  if (isLoading) return null;

  // On a server error we stay on the public route — the user may still
  // be able to log in and recover, so we show a warning rather than
  // blocking access to the form entirely.
  if (sessionError) {
    return (
      <>
        <Box sx={{ p: 2 }}>
          <Alert
            severity="warning"
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                Retry
              </Button>
            }
          >
            Unable to reach the server. You can still try to sign in.
          </Alert>
        </Box>
        {children}
      </>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}
