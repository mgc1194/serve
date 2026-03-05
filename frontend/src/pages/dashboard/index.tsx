// pages/dashboard/index.tsx — Dashboard with navigation cards to app sections.

import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { Box, Container, Typography } from '@mui/material';

import { HouseholdsNavCard } from '@pages/dashboard/households-nav-card';
import { NavCard } from '@serve/components/nav-card';
import { useAuth } from '@serve/context/auth-context';
import { AppHeader } from '@serve/layout/app-header';

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
          <NavCard
            icon={<AccountBalanceOutlinedIcon />}
            title="Accounts"
            description="View and manage your financial accounts."
            onClick={() => {}}
            disabled
          />
        </Box>
      </Container>
    </Box>
  );
}
