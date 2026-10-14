// pages/budget-detail/index.tsx — Per-budget detail page: the budget's
// name and period, a Sync control that recomputes actual_amount for every
// line from real transactions (actual_amount is a cache — see Budget's own
// docstring — so without a sync the Actual/Diff columns just show whatever
// was last computed, possibly nothing), an Edit control that stages
// planned-amount changes and deletions locally until "Confirm changes" —
// see the edit-mode state below — a placeholder net-this-month section
// (the real figure is a separate follow-up — it needs the same lines
// fetched here, but isn't wired up yet), the Earnings/Spending columns
// (BudgetColumn/BudgetLineRow) built from the budget's own lines, and an
// "Add X category" button under each column — a single shared button
// looked like it only added earning categories (it sat right under the
// Earnings column), so each column gets its own, pre-scoped to that
// column's type.
//
// No GET /budgets/{id} single-fetch endpoint exists (or is needed) for one
// budget among a household's handful — the budget itself is found by id in
// the same listBudgets(householdId) response already used everywhere else.

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SyncIcon from '@mui/icons-material/Sync';
import { Alert, Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import { BudgetColumn } from '@pages/budget-detail/budget-column';
import { CreateBudgetLineDialog } from '@pages/budget-detail/create-budget-line-dialog';
import type { Budget, BudgetLine } from '@serve/types/global';
import {
  listBudgetLines,
  listBudgets,
  syncBudget,
  updateBudgetLine,
  deleteBudgetLine,
  ApiError,
} from '@services/budgets';
import { isWholeDollarAmount } from '@utils/currency';

// Matches transaction-row.tsx's formatDate, for consistency across the
// app. Appending T00:00:00 forces local-time parsing of the bare
// YYYY-MM-DD date — without it, `new Date(iso)` parses as UTC midnight,
// which can display as the previous day in negative-UTC-offset timezones.
function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPeriod(budget: Budget): string {
  if (budget.type === 'project') return 'No fixed period';
  if (!budget.period_start || !budget.period_end) return '';
  return `${formatDate(budget.period_start)} – ${formatDate(budget.period_end)}`;
}

// synced_at is a full timestamp (not a bare date), so — unlike formatDate
// above — it parses correctly as-is with no local-midnight workaround.
function formatSyncedAt(syncedAt: string | null): string {
  if (!syncedAt) return 'Never synced';
  return `Synced ${new Date(syncedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

// isWholeDollarAmount applied to a staged edit of an existing line's
// planned_amount. Returns null for anything that isn't exactly that —
// including an empty string, mid-edit — so callers can tell "not editable
// yet" apart from "edited to a real number".
function parsePlannedAmountDraft(raw: string): number | null {
  return isWholeDollarAmount(raw) ? Number(raw) : null;
}

export function BudgetDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const budgetId = Number(id);
  const { activeHousehold } = useActiveHousehold();
  const householdId = activeHousehold?.id;

  const [budget, setBudget] = useState<Budget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // null = closed; otherwise which column's button opened it, and so
  // which category type CreateBudgetLineDialog is scoped to.
  const [lineDialogType, setLineDialogType] = useState<'earning' | 'spending' | null>(null);

  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [isLoadingLines, setIsLoadingLines] = useState(false);
  const [linesError, setLinesError] = useState<string | null>(null);

  // Declared up here (rather than next to handleSync, below) so the
  // budget-loading effect's load() can reset them on a scope change — see
  // the comment inside it.
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Edit mode stages planned-amount changes and deletions locally —
  // nothing reaches the backend until "Confirm changes" — rather than
  // saving each one immediately. plannedEdits holds the raw TextField
  // text per line id (not yet parsed/validated; see
  // parsePlannedAmountDraft), so a line with no entry here hasn't been
  // touched this edit session. Declared up here for the same reason as
  // isSyncing/syncError above: load() resets all of this on an actual
  // scope change.
  const [isEditMode, setIsEditMode] = useState(false);
  const [plannedEdits, setPlannedEdits] = useState<Record<number, string>>({});
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<number>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // loadRef gives the retry button a stable reference to the latest fetch
  // without making it a useEffect dependency.
  const loadRef = useRef<() => void>(() => {});

  // Guards which fetch is allowed to touch state at all (data and loading
  // flag alike), so an earlier request resolving after a newer one has
  // started — e.g. Retry clicked again before the first attempt settles —
  // can't overwrite the newer one's result or clear isLoading out from
  // under it. Same pattern as BudgetsPage.
  const requestIdRef = useRef(0);

  // Identifies the current route+household "visit", for handleSync's own
  // staleness guard below — deliberately a generation counter, not a
  // budget-id comparison like currentBudgetIdRef (used for onCreate's
  // guard, further down). Comparing ids alone can't tell two separate
  // visits to the SAME budget apart: navigate 9 -> 10 -> back to 9 while a
  // sync from the FIRST visit to 9 is still in flight, and a budget-id-only
  // check would see id 9 both times and wrongly let that stale response
  // overwrite the second visit's budget/lines. Bumped here, in the effect
  // body itself rather than inside load(), so a manual Retry click on the
  // SAME scope (which also calls load(), via loadRef) doesn't bump it —
  // only an actual budgetId/householdId change should invalidate an
  // in-flight sync.
  const scopeGenerationRef = useRef(0);

  useEffect(() => {
    let ignore = false;
    scopeGenerationRef.current += 1;

    function load() {
      const requestId = ++requestIdRef.current;

      // Clears the previous scope's budget (and closes any open dialog
      // reading budgetId/householdId off it) synchronously, before the new
      // fetch even starts. Without this, a route change to a different
      // budget — or the active household changing — left `budget` (and a
      // still-open CreateBudgetLineDialog) pointing at the old scope for
      // the whole duration of the new fetch: a submit in that window could
      // create a line on the wrong budget, and the dialog could reappear
      // open once the new budget loaded, since lineDialogType was never
      // reset either.
      setBudget(null);
      setLineDialogType(null);
      // Same reasoning for the Sync button's own state: it's keyed off
      // currentBudgetIdRef the same way onCreate is below, but that guard
      // only protects against OVERWRITING the new scope with a stale
      // result — it does nothing for isSyncing/syncError themselves. A
      // sync started against the old budget, still in flight when the
      // scope changes, hits that guard on resolution and skips
      // setIsSyncing(false) entirely — since this state is page-global,
      // not re-derived from `budget`, the NEW budget's Sync button would
      // otherwise stay disabled forever, and a previous budget's error
      // could carry over into the new scope. Resetting here — on
      // budgetId/householdId actually changing — rather than every time
      // `budget` itself refreshes (e.g. a successful sync replacing it)
      // is what keeps this from firing on every sync.
      setIsSyncing(false);
      setSyncError(null);
      // Same reasoning again, for edit mode: a route/household change
      // while mid-edit would otherwise leave stale drafts (and a stuck
      // "Confirm changes") pointed at a budget no longer on screen.
      setIsEditMode(false);
      setPlannedEdits({});
      setPendingDeleteIds(new Set());
      setIsConfirming(false);
      setConfirmError(null);

      if (householdId === undefined) {
        setIsLoading(false);
        return;
      }
      if (Number.isNaN(budgetId)) {
        setError('Budget not found.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      listBudgets(householdId)
        .then(budgets => {
          if (ignore || requestId !== requestIdRef.current) return;
          const found = budgets.find(b => b.id === budgetId) ?? null;
          setBudget(found);
          if (!found) setError('Budget not found.');
        })
        .catch(err => {
          if (ignore || requestId !== requestIdRef.current) return;
          setError(err instanceof ApiError ? err.message : 'Could not load budget.');
        })
        .finally(() => {
          if (!ignore && requestId === requestIdRef.current) setIsLoading(false);
        });
    }

    loadRef.current = load;
    load();

    return () => {
      ignore = true;
    };
  }, [householdId, budgetId]);

  // linesLoadRef gives the lines section's own retry button a stable
  // reference, same pattern as loadRef above.
  const linesLoadRef = useRef<() => void>(() => {});

  // Same requestId guard as the budget fetch above, for the same reason:
  // `ignore` alone only distinguishes "this effect run" from "a later one"
  // (e.g. budget changing) — it does nothing for two overlapping calls to
  // loadLines() from the SAME effect run, which Retry can produce (clicked
  // again before the first attempt settles). Without this, the older
  // response could overwrite the newer result and its .finally could clear
  // isLoadingLines while the newer request was still pending.
  const linesRequestIdRef = useRef(0);

  // Keys the effect below by id, not by `budget` itself — handleSync's
  // setBudget(result.budget) (and the budget-loading effect's own
  // setBudget(found)) both construct a brand-new object, a different
  // reference even when it's the SAME budget. Depending on `budget`
  // directly would re-run this effect on every sync too, re-fetching
  // lines that sync's own response just supplied — flashing the columns
  // back to "Loading categories…" and letting that redundant GET
  // overwrite the freshly-synced lines once it resolves.
  const loadedBudgetId = budget?.id;

  useEffect(() => {
    let ignore = false;

    function loadLines() {
      const requestId = ++linesRequestIdRef.current;

      if (loadedBudgetId === undefined) {
        setLines([]);
        setLinesError(null);
        setIsLoadingLines(false);
        return;
      }

      setIsLoadingLines(true);
      setLinesError(null);

      listBudgetLines(loadedBudgetId)
        .then(result => {
          if (ignore || requestId !== linesRequestIdRef.current) return;
          setLines(result);
        })
        .catch(err => {
          if (ignore || requestId !== linesRequestIdRef.current) return;
          setLinesError(err instanceof ApiError ? err.message : 'Could not load categories.');
        })
        .finally(() => {
          if (!ignore && requestId === linesRequestIdRef.current) setIsLoadingLines(false);
        });
    }

    linesLoadRef.current = loadLines;
    loadLines();

    return () => {
      ignore = true;
    };
  }, [loadedBudgetId]);

  // Tracks the budget currently on screen by id, read (not captured) at
  // the moment a create actually resolves — see onCreate below. A plain
  // closure over `budget` wouldn't do: CreateBudgetLineDialog unmounts the
  // instant the route/household changes (budget resets to null), but its
  // already-in-flight create keeps running and still calls the onCreate
  // closure it was holding at that point, which closed over the OLD
  // budget — not whatever budget is on screen by the time the create
  // settles. A ref's .current is read fresh at call time, so it reflects
  // reality regardless of which stale closure is invoking it.
  const currentBudgetIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    currentBudgetIdRef.current = budget?.id;
  }, [budget]);

  async function handleSync() {
    if (!budget || isSyncing) return;
    const syncedBudgetId = budget.id;
    const syncScope = scopeGenerationRef.current;

    setIsSyncing(true);
    setSyncError(null);
    try {
      const result = await syncBudget(syncedBudgetId);
      // scopeGenerationRef, not a budget-id comparison — see the comment
      // where it's declared above: the route/household can move to a
      // different budget and back to this same one while this request is
      // still in flight, and an id-only check can't tell that revisit
      // apart from never having left.
      if (syncScope !== scopeGenerationRef.current) return;
      // Invalidates any listBudgetLines call already in flight (the
      // initial load, or a lines Retry) — without this, if it resolves
      // AFTER this sync, its now-stale response would silently overwrite
      // the lines this sync just supplied, and its own .finally would
      // leave isLoadingLines stuck true in the meantime, hiding the
      // freshly-synced columns behind "Loading categories…" until that
      // older request finally settled.
      linesRequestIdRef.current += 1;
      setBudget(result.budget);
      setLines(result.lines);
      setLinesError(null);
      setIsLoadingLines(false);
    } catch (err) {
      if (syncScope !== scopeGenerationRef.current) return;
      setSyncError(err instanceof ApiError ? err.message : 'Could not sync budget.');
    } finally {
      if (syncScope === scopeGenerationRef.current) setIsSyncing(false);
    }
  }

  function handleEnterEditMode() {
    if (isSyncing) return;
    setIsEditMode(true);
  }

  function handleCancelEdit() {
    if (isConfirming) return;
    setIsEditMode(false);
    setPlannedEdits({});
    setPendingDeleteIds(new Set());
    setConfirmError(null);
  }

  function handlePlannedAmountChange(lineId: number, value: string) {
    setPlannedEdits(prev => ({ ...prev, [lineId]: value }));
  }

  function handleDeleteDraft(lineId: number) {
    setPendingDeleteIds(prev => new Set(prev).add(lineId));
    // A pending edit for a line that's now being deleted is moot — drop
    // it so confirm doesn't also fire a pointless PATCH right before the
    // DELETE for the same line.
    setPlannedEdits(prev => {
      if (!(lineId in prev)) return prev;
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
  }

  async function handleConfirmChanges() {
    if (isConfirming) return;
    const confirmScope = scopeGenerationRef.current;

    const edits = Object.entries(plannedEdits)
      .filter(([idStr]) => !pendingDeleteIds.has(Number(idStr)))
      .map(([idStr, raw]) => ({ id: Number(idStr), plannedAmount: parsePlannedAmountDraft(raw) }))
      // Confirm is disabled while any draft is invalid (see hasInvalidDraft
      // below), so this filters out only edits with nothing to send —
      // e.g. a line whose draft matches its already-committed value.
      .filter((edit): edit is { id: number; plannedAmount: number } => edit.plannedAmount !== null);
    const deletes = [...pendingDeleteIds];

    if (edits.length === 0 && deletes.length === 0) {
      setIsEditMode(false);
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    const results = await Promise.allSettled([
      ...edits.map(({ id, plannedAmount }) => updateBudgetLine(id, { planned_amount: plannedAmount })),
      ...deletes.map(id => deleteBudgetLine(id)),
    ]);

    // Same staleness guard as handleSync/onCreate: the route/household can
    // move to a different budget while this batch is still in flight. The
    // writes above still happened against the OLD budget (correctly —
    // that's what was asked for); this only stops their result from
    // touching whatever's now on screen.
    if (confirmScope !== scopeGenerationRef.current) return;

    const succeededEditIds = new Set<number>();
    const succeededDeleteIds = new Set<number>();
    let failedCount = 0;
    results.forEach((result, i) => {
      const isEdit = i < edits.length;
      if (result.status === 'rejected') {
        failedCount += 1;
        return;
      }
      if (isEdit) succeededEditIds.add(edits[i].id);
      else succeededDeleteIds.add(deletes[i - edits.length]);
    });

    if (succeededEditIds.size > 0 || succeededDeleteIds.size > 0) {
      setLines(prev =>
        prev
          .filter(line => !succeededDeleteIds.has(line.id))
          .map(line => {
            if (!succeededEditIds.has(line.id)) return line;
            const plannedAmount = edits.find(edit => edit.id === line.id)?.plannedAmount;
            return plannedAmount === undefined ? line : { ...line, planned_amount: plannedAmount };
          }),
      );
    }

// Clears a succeeded EDIT's draft. A failed edit stays staged
    // (and visible/editable) so the user can see it and retry.
    setPlannedEdits(prev => {
      const next = { ...prev };
      succeededEditIds.forEach(id => delete next[id]);
      return next;
    });
    // Every ATTEMPTED delete clears here, succeeded or not — not just
    // succeededDeleteIds. visibleLines (below) filters by pendingDeleteIds
    // alone, so leaving a failed delete's id in this set would keep
    // hiding that row forever, with no way to see it, undo it, or retry
    // it — exactly backwards from what the error message says ("stays
    // staged", implying it's still there to act on). Reverting it to
    // "not marked for deletion" instead makes the row visible again; if
    // the user still wants it gone, clicking Delete starts a fresh attempt.
    setPendingDeleteIds(prev => {
      const next = new Set(prev);
      deletes.forEach(id => next.delete(id));
      return next;
    });

    if (failedCount > 0) {
      setConfirmError(
        `${failedCount} change${failedCount === 1 ? '' : 's'} could not be saved. Please try again.`,
      );
    } else {
      setIsEditMode(false);
    }
    setIsConfirming(false);
  }

  // hasInvalidDraft gates the Confirm button — rather than silently
  // dropping an invalid edit at confirm time (which would have no visible
  // effect and no error, since nothing was ever sent for it), the user
  // has to resolve it before confirming at all. The TextField itself
  // flags which one via the same parsePlannedAmountDraft check.
  const hasInvalidDraft = Object.values(plannedEdits).some(
    raw => parsePlannedAmountDraft(raw) === null,
  );

  // Drafts applied to a display copy of `lines` — not `lines` itself,
  // which stays the last-confirmed server state until Confirm actually
  // succeeds. A line with an invalid (or not-yet-edited) draft keeps
  // showing its last-committed planned_amount here; the TextField showing
  // the raw, possibly-invalid text is a separate concern (plannedEdits
  // itself, passed straight through to BudgetColumn below).
  const visibleLines = lines
    .filter(line => !pendingDeleteIds.has(line.id))
    .map(line => {
      const raw = plannedEdits[line.id];
      if (raw === undefined) return line;
      const plannedAmount = parsePlannedAmountDraft(raw);
      return plannedAmount === null ? line : { ...line, planned_amount: plannedAmount };
    });

  const earningLines = visibleLines.filter(line => line.category_type === 'earning');
  const spendingLines = visibleLines.filter(line => line.category_type === 'spending');

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      {/* lg, not the original md — the Earnings/Spending columns sit side
          by side inside this container, and md left each one too narrow
          for a wide category name plus a large budgeted/total/diff amount
          together on one row. */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/budgets')}
          size="small"
          sx={{ mb: 3, color: 'text.secondary' }}
        >
          Budgets
        </Button>

        {!activeHousehold ? (
          <Typography color="text.secondary">No household selected.</Typography>
        ) : isLoading ? (
          <Typography color="text.secondary">Loading budget…</Typography>
        ) : error ? (
          <Box>
            <Typography color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
            <Button variant="outlined" size="small" onClick={() => loadRef.current()}>
              Retry
            </Button>
          </Box>
        ) : budget && budget.id === budgetId && budget.household_id === householdId ? (
          <>
            {/* budget.id === budgetId && budget.household_id === householdId
                (not just a `budget` truthiness check) — on a route or
                household change, `budget` is cleared to null by the effect
                above, but only AFTER this render, since effects run after
                render/paint. Without re-checking identity here, this branch
                would render the OLD budget's columns, lines, and "Add"
                buttons — pointed at the old budgetId — for one frame before
                the effect catches up. */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Box>
                <Typography variant="h3" sx={{ mb: 0.5 }}>
                  {budget.name}
                </Typography>
                <Typography color="text.secondary">{formatPeriod(budget)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={isSyncing ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
                    variant="outlined"
                    size="small"
                    onClick={handleSync}
                    // Also disabled by isEditMode — a sync's response
                    // replaces `lines` wholesale, which would wipe out
                    // whatever's staged but not yet confirmed.
                    disabled={isSyncing || isEditMode}
                  >
                    Sync budget
                  </Button>
                  {isEditMode ? (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleCancelEdit}
                        disabled={isConfirming}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleConfirmChanges}
                        disabled={isConfirming || hasInvalidDraft}
                        startIcon={
                          isConfirming ? <CircularProgress size={14} color="inherit" /> : undefined
                        }
                      >
                        Confirm changes
                      </Button>
                    </>
                  ) : (
                    <Button
                      startIcon={<EditIcon />}
                      variant="outlined"
                      size="small"
                      onClick={handleEnterEditMode}
                      disabled={isSyncing}
                    >
                      Edit
                    </Button>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {formatSyncedAt(budget.synced_at)}
                </Typography>
              </Box>
            </Box>
            {syncError && (
              <Alert severity="error" onClose={() => setSyncError(null)} sx={{ mt: 1 }}>
                {syncError}
              </Alert>
            )}
            {confirmError && (
              <Alert severity="error" onClose={() => setConfirmError(null)} sx={{ mt: 1 }}>
                {confirmError}
              </Alert>
            )}

            {/* Placeholder — the real net-this-month figure is wired up in
                a follow-up PR, computed from the same lines fetched below. */}
            <Box sx={{ mt: 1.5, mb: 3 }}>
              <Typography variant="h6">Net this month: —</Typography>
            </Box>

            {isLoadingLines ? (
              <Typography color="text.secondary">Loading categories…</Typography>
            ) : linesError ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography color="error">{linesError}</Typography>
                <Button size="small" onClick={() => linesLoadRef.current()}>
                  Retry
                </Button>
              </Box>
            ) : (
              // These buttons only ever render here, once lines have
              // loaded successfully — the loading/error branches above
              // hide them entirely (there's no column to add into while
              // either one is showing). They're disabled (not hidden)
              // while isSyncing or isEditMode: a line created mid-sync
              // would exist only in `lines`, not in the sync's own
              // in-flight snapshot, and setLines(result.lines) on
              // resolution would silently drop it; a line created
              // mid-edit would have no staged draft of its own and would
              // just add an unrelated complication to what edit mode is
              // meant to be reconciling.
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <BudgetColumn
                    title="Earnings"
                    type="earning"
                    lines={earningLines}
                    isEditMode={isEditMode}
                    plannedAmountInputs={plannedEdits}
                    onPlannedAmountChange={handlePlannedAmountChange}
                    onDelete={handleDeleteDraft}
                    disabled={isConfirming}
                  />
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => setLineDialogType('earning')}
                    disabled={isSyncing || isEditMode}
                    sx={{ mt: 2 }}
                  >
                    Add earning category
                  </Button>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <BudgetColumn
                    title="Spending"
                    type="spending"
                    lines={spendingLines}
                    isEditMode={isEditMode}
                    plannedAmountInputs={plannedEdits}
                    onPlannedAmountChange={handlePlannedAmountChange}
                    onDelete={handleDeleteDraft}
                    disabled={isConfirming}
                  />
                  <Button
                    startIcon={<AddIcon />}
                    variant="outlined"
                    size="small"
                    onClick={() => setLineDialogType('spending')}
                    disabled={isSyncing || isEditMode}
                    sx={{ mt: 2 }}
                  >
                    Add spending category
                  </Button>
                </Box>
              </Box>
            )}
          </>
        ) : null}

        {householdId !== undefined &&
          budget &&
          budget.id === budgetId &&
          budget.household_id === householdId &&
          lineDialogType !== null && (
            <CreateBudgetLineDialog
              open
              budgetId={budget.id}
              householdId={householdId}
              categoryType={lineDialogType}
              onClose={() => setLineDialogType(null)}
              onCreate={created => {
                // A create that started against this budget can still
                // resolve after the route/household has since moved to a
                // different budget. Reject it rather than appending a line
                // from the old budget into whatever's currently on screen.
                if (created.budget_id !== currentBudgetIdRef.current) return;
                setLines(prev => {
                  // Budget ids alone don't distinguish two separate visits to
                  // the SAME budget: navigate 9 -> 10 -> back to 9 while this
                  // create is still in flight, and budget 9's lines GET (run
                  // again on the way back) can already include it by the
                  // time this stale callback finally resolves. Skip the
                  // append rather than adding a second row with a duplicate
                  // id (and a duplicate React key).
                  if (prev.some(line => line.id === created.id)) return prev;
                  return [...prev, created];
                });
              }}
            />
          )}
      </Container>
    </Box>
  );
}
