// pages/dashboard/index.tsx — Placeholder dashboard for authenticated users.

import { Box, Container, Typography } from '@mui/material';

import { useAuth } from '@serve/context/auth-context';
import { AppHeader } from '@serve/layout/app-header';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h3" sx={{ mb: 1 }}>
          Welcome{user?.first_name ? `, ${user.first_name}` : ''}
        </Typography>
        <Typography color="text.secondary">
          Your dashboard is on its way. Next up: importing transactions.
        </Typography>
      </Container>
    </Box>
  );
}
