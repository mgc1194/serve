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
import { LabelFilterBar } from '@pages/transactions/label-filter-bar';
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
// -1 is the "unlabeled" sentinel already established by NO_LABEL
// (transaction-label-cell.tsx) and UNLABELED_OPTION (label-filter-bar.tsx).
const UNLABELED_SENTINEL = -1;

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

  const labelIdParam = searchParams.get('label_id');
  const labelId: number | undefined = (() => {
    if (labelIdParam == null) return undefined;
    const parsed = Number(labelIdParam);
    return Number.isNaN(parsed) ? undefined : parsed;
  })();

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
          label_id: labelId,
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
  }, [householdId, labelId, cursor, previousCursor, sortKey, sortDir, refreshToken]);

  // Self-corrects a stale/invalid label_id (a bookmarked URL, a label
  // deleted since, or browser history from another household) once the
  // definitive label list has loaded — otherwise the filter control shows
  // "All labels" (labelId matches no option) while the request keeps
  // filtering by an id that can't match anything, and the table stays
  // empty with no way to tell why.
  //
  // Skipped while error is set: a failed load leaves labels empty (never
  // populated), which would otherwise look identical to "labelId isn't
  // among the household's labels" — wrongly treating a valid bookmarked
  // filter as stale, dropping it from the URL, and masking the real error
  // behind an unfiltered refetch.
  useEffect(() => {
    if (
      isLoading ||
      error !== null ||
      labelId === undefined ||
      labelId === UNLABELED_SENTINEL
    )
      return;
    if (labels.some(l => l.id === labelId)) return;

    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('label_id');
      next.delete('cursor');
      next.delete('previous_cursor');
      next.delete('page');
      return next;
    });
  }, [isLoading, error, labelId, labels, setSearchParams]);

  // ── URL mutation helpers ────────────────────────────────────────────────────
  // Fixed key order so the resulting URL is stable regardless of which
  // params happen to change — merging into a plain object first and only
  // then reading it back out in KEY_ORDER means insertion order (which
  // JS objects otherwise preserve) never leaks into the result.
  const KEY_ORDER = ['sort', 'sort_dir', 'page', 'label_id', 'cursor', 'previous_cursor'] as const;

  function buildParams(overrides: Record<string, string | undefined>) {
    const merged: Record<string, string | undefined> = {
      sort: sortKey !== DEFAULT_SORT ? sortKey : undefined,
      sort_dir: sortDir !== DEFAULT_DIR ? sortDir : undefined,
      page: page > 1 ? String(page) : undefined,
      label_id: labelId !== undefined ? String(labelId) : undefined,
      ...overrides,
    };

    const base: Record<string, string> = {};
    for (const key of KEY_ORDER) {
      const value = merged[key];
      if (value !== undefined) base[key] = value;
    }
    return base;
  }

  function handleLabelFilterChange(id: number | undefined) {
    setSearchParams(buildParams({
      label_id: id !== undefined ? String(id) : undefined,
      cursor: undefined,
      previous_cursor: undefined,
      page: undefined,
    }));
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
    const stillMatchesFilter =
      labelId === undefined ||
      (labelId === UNLABELED_SENTINEL ? updated.label_id === null : updated.label_id === labelId);

    if (!stillMatchesFilter) {
      // The edit moved this transaction out of the active label filter —
      // refetch rather than trying to locally patch count/pagination for a
      // row that's no longer part of the filtered result set.
      setRefreshToken(t => t + 1);
      return;
    }

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
    // Leave the dialog open — it shows its own success screen and only
    // closes when the user clicks Close (onClose below). Refresh the table
    // underneath in the meantime.
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
          {activeHousehold ? (
            <Typography variant="h4">
              <SwitchHouseholdButton
                sx={{ font: 'inherit', ml: -1 }}
                onChange={() =>
                  setSearchParams(
                    buildParams({
                      label_id: undefined,
                      cursor: undefined,
                      previous_cursor: undefined,
                      page: undefined,
                    }),
                  )
                }
              />
            </Typography>
          ) : (
            <Typography variant="h4">Transactions</Typography>
          )}
          <Button
            variant="outlined"
            startIcon={<FileUploadOutlinedIcon />}
            onClick={() => setImportOpen(true)}
          >
            Import CSV
          </Button>
        </Box>

        <LabelFilterBar
          labels={labels}
          labelId={labelId}
          onLabelChange={handleLabelFilterChange}
        />

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
