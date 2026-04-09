// pages/transactions/index.tsx — Transactions management page.
//
// Owns all URL-driven state: cursor, sort, sort_dir.
// Fetch logic lives in a useEffect; loadRef gives the Retry button a
// stable reference without adding load as an effect dependency.
// Active household is the user's first household — household switching
// will be handled globally in a follow-up PR.
// Rendering is delegated to TransactionsTable and ImportCsvDialog.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '@context/auth-context';
import { AppHeader } from '@layout/app-header';
import { ImportCsvDialog } from '@pages/transactions/import-csv-dialog';
import { TransactionsTable } from '@pages/transactions/transactions-table';
import type {
  FileImportResult,
  Household,
  Label,
  PaginatedTransactions,
  SortDir,
  SortField,
  Transaction,
} from '@serve/types/global';
import { listLabels, ApiError as LabelsApiError } from '@services/labels';
import { listTransactions, ApiError } from '@services/transactions';

const DEFAULT_SORT: SortField = 'date';
const DEFAULT_DIR: SortDir = 'desc';

export function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const households: Household[] = useMemo(() => user?.households ?? [], [user]);

  // Use the first household as the active one until global household
  // switching is implemented (tracked separately).
  const activeHousehold = households[0] ?? null;
  const householdId = activeHousehold?.id;

  // ── URL-driven state ────────────────────────────────────────────────────────
  const sortKey = (searchParams.get('sort') ?? DEFAULT_SORT) as SortField;
  const sortDir = (searchParams.get('sort_dir') ?? DEFAULT_DIR) as SortDir;
  const cursor = searchParams.get('cursor') ?? undefined;
  const previousCursor = searchParams.get('previous_cursor') ?? undefined;

  // ── Component state ─────────────────────────────────────────────────────────
  const [paginated, setPaginated] = useState<PaginatedTransactions | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  // loadRef gives the retry button a stable reference to the latest fetch
  // without making it a useEffect dependency.
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    function load() {
      if (householdId === undefined) {
        setPaginated(null);
        setLabels([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setPaginated(null);

      Promise.all([
        listTransactions({
          household_id: householdId,
          cursor,
          previous_cursor: previousCursor,
          sort: sortKey,
          sort_dir: sortDir,
        }),
        listLabels(householdId),
      ])
        .then(([page, lbls]) => {
          setPaginated(page);
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

    loadRef.current = load;
    load();
  }, [householdId, cursor, previousCursor, sortKey, sortDir]);

  // ── URL mutation helpers ────────────────────────────────────────────────────
  function buildParams(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (sortKey !== DEFAULT_SORT) base.sort = sortKey;
    if (sortDir !== DEFAULT_DIR) base.sort_dir = sortDir;
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined) base[k] = v;
      else delete base[k];
    }
    return base;
  }

  function handleSortChange(field: SortField, dir: SortDir) {
    setPage(1);
    setSearchParams(buildParams({
      sort: field,
      sort_dir: dir,
      cursor: undefined,
      previous_cursor: undefined,
    }));
  }

  function handleNextPage() {
    if (paginated?.next_cursor == null) return;
    setPage(p => p + 1);
    setSearchParams(buildParams({ cursor: paginated.next_cursor, previous_cursor: undefined }));
  }

  function handlePreviousPage() {
    if (paginated?.previous_cursor == null) return;
    setPage(p => Math.max(1, p - 1));
    setSearchParams(buildParams({ previous_cursor: paginated.previous_cursor, cursor: undefined }));
  }

  function handleUpdated(updated: Transaction) {
    setPaginated(prev =>
      prev
        ? { ...prev, results: prev.results.map(t => (t.id === updated.id ? updated : t)) }
        : prev,
    );
  }

  function handleDeleted(id: number) {
    setPaginated(prev =>
      prev
        ? { ...prev, results: prev.results.filter(t => t.id !== id), count: prev.count - 1 }
        : prev,
    );
  }

  function handleImported(_result: FileImportResult) {
    setImportOpen(false);
    setPage(1);
    setSearchParams(buildParams({ cursor: undefined, previous_cursor: undefined }));
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 3 }}
          variant="text"
          color="inherit"
        >
          Dashboard
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            {activeHousehold ? activeHousehold.name : 'Transactions'}
          </Typography>
          <Button
            variant="outlined"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={() => setImportOpen(true)}
          >
            Import CSV
          </Button>
        </Box>

        <TransactionsTable
          transactions={paginated?.results ?? []}
          labels={labels}
          isLoading={isLoading}
          error={error}
          onRetry={() => loadRef.current()}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onImport={() => setImportOpen(true)}
          count={paginated?.count ?? 0}
          offset={paginated?.offset ?? 0}
          page={page}
          nextCursor={paginated?.next_cursor ?? null}
          previousCursor={paginated?.previous_cursor ?? null}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
        />

        <ImportCsvDialog
          open={importOpen}
          households={households}
          onImported={handleImported}
          onClose={() => setImportOpen(false)}
        />
      </Container>
    </Box>
  );
}
