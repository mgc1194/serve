// components/protected-route/index.tsx — Redirects unauthenticated users to /login.
import { Alert, Box, Button } from '@mui/material';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '@serve/context/auth-context';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, sessionError } = useAuth();

  if (isLoading) return null;

  if (sessionError) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          p: 3,
        }}
      >
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => window.location.reload()}>
              Retry
            </Button>
          }
        >
          Unable to reach the server. Please check your connection and try again.
        </Alert>
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
