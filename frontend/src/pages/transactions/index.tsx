// pages/transactions/index.tsx — Transactions management page.
//
// Owns all URL-driven state: cursor, sort, sort_dir.
// Fetch logic lives in a useEffect; loadRef gives the Retry button a
// stable reference without adding load as an effect dependency.
// Active household comes from the session-wide useActiveHousehold() context;
// the header's household name doubles as the switch-household button.
// Rendering is delegated to TransactionsTable and ImportCsvDialog.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import { ImportCsvDialog } from '@pages/transactions/import-csv-dialog';
import { TransactionsTable } from '@pages/transactions/transactions-table';
import type {
  FileImportResult,
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
// Must match PAGE_SIZE in backend/api/v1/transactions.py
const PAGE_SIZE = 20;

export function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeHousehold } = useActiveHousehold();

  const householdId = activeHousehold?.id;

  // ── URL-driven state ────────────────────────────────────────────────────────
  const sortKey = (searchParams.get('sort') ?? DEFAULT_SORT) as SortField;
  const sortDir = (searchParams.get('sort_dir') ?? DEFAULT_DIR) as SortDir;
  const cursor = searchParams.get('cursor') ?? undefined;
  const previousCursor = searchParams.get('previous_cursor') ?? undefined;
  const page = Number(searchParams.get('page') ?? '1');

  // ── Component state ─────────────────────────────────────────────────────────
  const [paginated, setPaginated] = useState<PaginatedTransactions | null>(null);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  // Bumped to force a refetch (e.g. after a CSV import) even when none of
  // the URL-driven params below have changed.
  const [refreshToken, setRefreshToken] = useState(0);

  // ── Fetch ───────────────────────────────────────────────────────────────────
  // loadRef gives the retry button a stable reference to the latest fetch
  // without making it a useEffect dependency.
  const loadRef = useRef<() => void>(() => {});

  useEffect(() => {
    let ignore = false;

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
          if (ignore) return;
          setPaginated(page);
          setLabels(lbls);
        })
        .catch(err => {
          if (ignore) return;
          setError(
            err instanceof ApiError || err instanceof LabelsApiError
              ? err.message
              : 'Could not load transactions.',
          );
        })
        .finally(() => {
          if (!ignore) setIsLoading(false);
        });
    }

    loadRef.current = load;
    load();

    return () => {
      ignore = true;
    };
  }, [householdId, cursor, previousCursor, sortKey, sortDir, refreshToken]);

  // ── URL mutation helpers ────────────────────────────────────────────────────
  function buildParams(overrides: Record<string, string | undefined>) {
    const base: Record<string, string> = {};
    if (sortKey !== DEFAULT_SORT) base.sort = sortKey;
    if (sortDir !== DEFAULT_DIR) base.sort_dir = sortDir;
    if (page > 1) base.page = String(page);
    for (const [k, v] of Object.entries(overrides)) {
      if (v !== undefined) base[k] = v;
      else delete base[k];
    }
    return base;
  }

  function handleSortChange(field: SortField, dir: SortDir) {
    setSearchParams(buildParams({
      sort: field,
      sort_dir: dir,
      cursor: undefined,
      previous_cursor: undefined,
      page: undefined,
    }));
  }

  function handleNextPage() {
    if (paginated?.next_cursor == null) return;
    setSearchParams(buildParams({
      cursor: paginated.next_cursor,
      previous_cursor: undefined,
      page: String(page + 1),
    }));
  }

  function handlePreviousPage() {
    if (paginated?.previous_cursor == null) return;
    setSearchParams(buildParams({
      previous_cursor: paginated.previous_cursor,
      cursor: undefined,
      page: String(Math.max(1, page - 1)),
    }));
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
    setSearchParams(buildParams({ cursor: undefined, previous_cursor: undefined, page: undefined }));
    setRefreshToken(t => t + 1);
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h4">
              {activeHousehold ? activeHousehold.name : 'Transactions'}
            </Typography>
            {activeHousehold && (
              <SwitchHouseholdButton
                iconOnly
                onChange={() =>
                  setSearchParams(
                    buildParams({ cursor: undefined, previous_cursor: undefined, page: undefined }),
                  )
                }
              />
            )}
          </Box>
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
          pageSize={PAGE_SIZE}
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
          onImported={handleImported}
          onClose={() => setImportOpen(false)}
        />
      </Container>
    </Box>
  );
}
