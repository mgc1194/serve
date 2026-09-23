// pages/budgets/index.tsx — Budgets page shell.
//
// Establishes the route and layout only; category and budget management
// land in follow-up PRs.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router';

import { AppHeader } from '@layout/app-header';

export function BudgetsPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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

        <Typography variant="h3">Budgets</Typography>
      </Container>
    </Box>
  );
}
