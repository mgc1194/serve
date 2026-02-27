// pages/register/index.tsx — Register page. Composes BrandPanel and RegisterForm.

import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router';

import { BrandPanel } from '@serve/components/brand-panel';
import { RegisterForm } from '@serve/pages/register/register-form';

export function RegisterPage() {
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
            We Serve<br />so you <em>Slay</em>.
          </>
        }
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 3, md: 6 },
          overflowY: 'auto',
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Create an account
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4, fontSize: '0.9rem' }}>
            Start slaying your finances today
          </Typography>

          <RegisterForm />

          <Typography
            sx={{ mt: 3, textAlign: 'center', fontSize: '0.875rem', color: 'text.secondary' }}
          >
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" fontWeight={600} color="primary">
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
