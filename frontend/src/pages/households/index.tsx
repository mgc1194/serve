import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Container, Divider, Skeleton, Typography, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { CreateHouseholdForm } from '@pages/households/create-household-form';
import { HouseholdDetailCard } from '@pages/households/household-detailed-card';
import { AppHeader } from '@serve/layout/app-header';
import type { HouseholdDetail } from '@serve/types/global';
import { listHouseholds } from '@services/households';

export function HouseholdsPage() {
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<HouseholdDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listHouseholds()
      .then(setHouseholds)
      .finally(() => setIsLoading(false));
  }, []);

  function handleCreated(h: HouseholdDetail) {
    setHouseholds(prev => [...prev, h]);
  }

  function handleUpdated(h: HouseholdDetail) {
    setHouseholds(prev => prev.map(x => (x.id === h.id ? h : x)));
  }

  function handleDeleted(id: number) {
    setHouseholds(prev => prev.filter(x => x.id !== id));
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="sm" sx={{ py: 6 }}>

        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Dashboard
        </Button>

        <Typography variant="h3" sx={{ mb: 1 }}>
          Households
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Manage your households and their members.
        </Typography>

        <CreateHouseholdForm onCreate={handleCreated} />

        <Divider sx={{ my: 4 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {isLoading ? (
            [0, 1].map(i => <Skeleton key={i} variant="rounded" height={220} />)
          ) : households.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No households yet — create one above.
            </Typography>
          ) : (
            households.map(h => (
              <HouseholdDetailCard
                key={h.id}
                household={h}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))
          )}
        </Box>

      </Container>
    </Box>
  );
}
