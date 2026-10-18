// pages/summary/label-transactions-dialog/index.tsx — Modal listing the
// transactions behind one label's total for the Summary page's currently
// selected month (opened from summary-section.tsx's per-label row onClick).
// A simpler read-only table (date, concept, account, amount) is enough —
// inline editing belongs on the Transactions page, not here.
//
// Caps to the first page (PAGE_SIZE results from listTransactions, newest
// first) rather than adding "load more"/pagination controls — a single
// month's worth of one label's transactions is normally small — but shows
// a "Showing first N of count" note rather than silently truncating when
// there happens to be more.

import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import type { Transaction } from '@serve/types/global';
import { listTransactions, ApiError } from '@services/transactions';
import { formatCurrency, signPrefix } from '@utils/currency';

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

/** The subset of LabelSummary this dialog needs — see summary-section.tsx. */
export interface LabelTransactionsDialogLabel {
  label_id: number;
  label_name: string;
  label_color: string;
}

interface LabelTransactionsDialogProps {
  open: boolean;
  onClose: () => void;
  householdId: number;
  label: LabelTransactionsDialogLabel | null;
  /** Inclusive "YYYY-MM-DD" bounds of the selected month — see date-utils.ts's monthDateRange. */
  dateFrom: string;
  dateTo: string;
  monthLabel: string;
}

export function LabelTransactionsDialog({
  open,
  onClose,
  householdId,
  label,
  dateFrom,
  dateTo,
  monthLabel,
}: LabelTransactionsDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !label) return;

    let ignore = false;
    // Synchronizes with the fetch kicked off right below — same
    // intentional pattern as pages/summary/index.tsx's own fetch effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    listTransactions({
      household_id: householdId,
      label_id: label.label_id,
      date_from: dateFrom,
      date_to: dateTo,
    })
      .then(page => {
        if (ignore) return;
        setTransactions(page.results);
        setTotalCount(page.count);
      })
      .catch(err => {
        if (ignore) return;
        setError(err instanceof ApiError ? err.message : 'Could not load transactions.');
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [open, label, householdId, dateFrom, dateTo]);

  const hasMore = totalCount > transactions.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {label && (
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: label.label_color,
              flexShrink: 0,
            }}
          />
        )}
        <Box sx={{ flex: 1 }}>
          {label?.label_name}{' '}
          <Typography component="span" variant="body2" color="text.secondary">
            · {monthLabel}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!isLoading && !error && transactions.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
            No transactions for this label in {monthLabel}.
          </Typography>
        )}

        {!isLoading && !error && transactions.length > 0 && (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Concept</TableCell>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map(transaction => (
                    <TableRow key={transaction.id}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>{transaction.concept}</TableCell>
                      <TableCell>{transaction.account_name}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          whiteSpace: 'nowrap',
                          fontVariantNumeric: 'tabular-nums',
                          color: transaction.amount >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 500,
                        }}
                      >
                        {signPrefix(transaction.amount)}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {hasMore && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 1.5 }}
              >
                Showing first {transactions.length} of {totalCount} transactions.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
