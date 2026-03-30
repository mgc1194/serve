// pages/transactions/index.tsx — Transactions management page.
//
// Orchestrates data fetching and URL-driven filter state.
// Rendering is delegated to AccountsFilterBar (reused), TransactionsTable,
// and ImportCsvDialog.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '@context/auth-context';
import { AppHeader } from '@layout/app-header';
import { AccountsFilterBar } from '@pages/accounts/accounts-filter-bar';
import { ImportCsvDialog } from '@pages/transactions/import-csv-dialog';
import { TransactionsTable } from '@pages/transactions/transactions-table';
import type { FileImportResult, Household, Label, Transaction } from '@serve/types/global';
import { listLabels, ApiError as LabelsApiError } from '@services/labels';
import { listTransactions, ApiError } from '@services/transactions';

export function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const householdIdParam = searchParams.get('household_id');
  const householdIdFilter =
    householdIdParam !== null && householdIdParam.trim() !== ''
      ? (() => {
          const parsed = Number(householdIdParam);
          return Number.isNaN(parsed) ? undefined : parsed;
        })()
      : undefined;

  const households: Household[] = useMemo(() => user?.households ?? [], [user]);

  const activeHousehold =
    householdIdFilter !== undefined
      ? households.find(h => h.id === householdIdFilter)
      : undefined;

  useEffect(() => {
    if (householdIdFilter === undefined && households.length > 0) {
      setSearchParams({ household_id: String(households[0].id) }, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [households]);

  function load() {
    if (householdIdFilter === undefined) {
      setTransactions([]);
      setLabels([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      listTransactions({ household_id: householdIdFilter }),
      listLabels(householdIdFilter),
    ])
      .then(([txns, lbls]) => {
        setTransactions(txns);
        setLabels(lbls);
      })
      .catch(err => {
        setError(
          err instanceof ApiError || err instanceof LabelsApiError
            ? err.message
            : 'Could not load transactions.',
        );
      })
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [householdIdFilter]);

  function handleHouseholdChange(id: number | undefined) {
    if (id === undefined) {
      setSearchParams({});
    } else {
      setSearchParams({ household_id: String(id) });
    }
  }

  function handleUpdated(updated: Transaction) {
    setTransactions(prev =>
      prev.map(tx => (tx.id === updated.id ? updated : tx)),
    );
  }

  function handleDeleted(id: number) {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }

  function handleImported(_result: FileImportResult) {
    // Refresh the full list after a successful import
    load();
  }

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
                ? `${activeHousehold.name}`
                : 'Select a household to view transactions.'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={() => setImportOpen(true)}
            disabled={householdIdFilter === undefined}
          >
            Import CSV
          </Button>
        </Box>

        <AccountsFilterBar
          households={households}
          householdId={householdIdFilter}
          onHouseholdChange={handleHouseholdChange}
        />

        <TransactionsTable
          transactions={transactions}
          labels={labels}
          isLoading={isLoading}
          error={error}
          onRetry={load}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onImport={() => setImportOpen(true)}
        />

        <ImportCsvDialog
          open={importOpen}
          households={households}
          onClose={() => setImportOpen(false)}
          onImported={handleImported}
        />
      </Container>
    </Box>
  );
}