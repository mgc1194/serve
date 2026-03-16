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
import type { AccountDetail, FileImportResult, Household, Transaction } from '@serve/types/global';
import { listAccounts, ApiError as AccountsApiError } from '@services/accounts';
import { listTransactions, ApiError } from '@services/transactions';


export function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<AccountDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Filter stored in URL so it survives reload and is shareable
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

  // The household to fetch transactions for: either the filtered one or the
  // first one available (transactions require an explicit household_id).
  const resolvedHouseholdId =
    householdIdFilter ?? (households.length > 0 ? households[0].id : undefined);

  function load() {
    if (resolvedHouseholdId === undefined) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([
      listTransactions({ household_id: resolvedHouseholdId }),
      listAccounts({ household_id: resolvedHouseholdId }),
    ])
      .then(([txns, accts]) => {
        setTransactions(txns);
        setAccounts(accts);
      })
      .catch(err => {
        setError(
          err instanceof ApiError || err instanceof AccountsApiError
            ? err.message
            : 'Could not load transactions.',
        );
      })
      .finally(() => setIsLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [resolvedHouseholdId]);

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
                ? `Showing transactions in ${activeHousehold.name}`
                : 'All transactions across your households.'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={() => setImportOpen(true)}
            disabled={accounts.length === 0}
          >
            Import CSV
          </Button>
        </Box>

        {/* Household filter */}
        {households.length > 1 && (
          <AccountsFilterBar
            households={households}
            householdId={householdIdFilter}
            onHouseholdChange={handleHouseholdChange}
          />
        )}

        <TransactionsTable
          transactions={transactions}
          isLoading={isLoading}
          error={error}
          onRetry={load}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onImport={() => setImportOpen(true)}
        />
      </Container>

      <ImportCsvDialog
        open={importOpen}
        households={households}
        onImported={handleImported}
        onClose={() => setImportOpen(false)}
      />
    </Box>
  );
}
