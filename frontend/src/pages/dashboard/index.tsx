// pages/dashboard/index.tsx — Dashboard with navigation cards to app sections.

import { Box, Container, Typography } from '@mui/material';

import { useAuth } from '@context/auth-context';
import { AppHeader } from '@layout/app-header';
import { AccountsNavCard } from '@pages/dashboard/accounts-nav-card';
import { HouseholdsNavCard } from '@pages/dashboard/households-nav-card';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="sm" sx={{ py: 6 }}>

        <Typography variant="h3" sx={{ mb: 1 }}>
          Welcome{user?.first_name ? `, ${user.first_name}` : ''}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 5 }}>
          What would you like to manage today?
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <HouseholdsNavCard />
          <AccountsNavCard />
        </Box>
      </Container>
    </Box>
  );
}
