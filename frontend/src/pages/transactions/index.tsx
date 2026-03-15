// pages/transactions/index.tsx — Transactions management page.
//
// Orchestrates data fetching and URL-driven filter state.
// Rendering is delegated to TransactionsFilterBar and TransactionsTable.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Typography } from '@mui/material';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '@context/auth-context';
import { AppHeader } from '@layout/app-header';
import type { Household } from '@serve/types/global';


export function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {user} = useAuth();


  // Filter stored in URL so it survives reload and is shareable
  const householdIdParam = searchParams.get('household_id');
  const householdIdFilter = 
    householdIdParam !== null
      ? (() => {
        const parsed = Number(householdIdParam);
        return isNaN(parsed) ? undefined : parsed;
      })()
      : undefined;
    
  const households: Household[] = useMemo(() => user?.households ?? [], [user]);
    
  const activeHousehold =
    householdIdFilter !== undefined
      ? households.find(h => h.id === householdIdFilter)
      : undefined;
    
    
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default'  }}>
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
        Dashboard
        </Button>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 4,
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box>
            <Typography variant="h3" sx={{ mb: 0.5 }}>
              Transactions
            </Typography>
            <Typography color="text.secondary">
              {activeHousehold
                ? `Showing transactions in ${activeHousehold.name}`
                : 'All transactions across your households.'}
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
