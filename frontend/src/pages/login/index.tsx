// pages/login/index.tsx — Login page. Composes BrandPanel and LoginForm.

import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

import { BrandPanel } from '@serve/components/brand-panel';
import { LoginForm } from '@serve/pages/login/login-form';

export function LoginPage() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        minHeight: '100vh',
      }}
    >
      <BrandPanel
        tagline={
          <>
            Your money,<br />is a <em>Serve</em>.
          </>
        }
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4, fontSize: '0.9rem' }}>
            Sign in to your account
          </Typography>

          <LoginForm />

          <Typography
            sx={{ mt: 3, textAlign: 'center', fontSize: '0.875rem', color: 'text.secondary' }}
          >
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" fontWeight={600} color="primary">
              Create one
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}