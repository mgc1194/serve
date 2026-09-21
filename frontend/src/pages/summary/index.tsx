// pages/summary/index.tsx — Detailed summary page.
//
// Household comes from the session-wide useActiveHousehold() context; only
// `month` remains URL-driven state.
// Rendering is delegated to SummaryFilters, SummaryTotalsBar, and SummarySection.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Alert, Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { SwitchHouseholdButton } from '@components/switch-household-button';
import { useActiveHousehold } from '@context/active-household-context';
import { AppHeader } from '@layout/app-header';
import {
  availableMonths,
  currentMonthStr,
  formatMonthLabel,
  parseMonthStr,
  toMonthStr,
  yearRange,
} from '@pages/summary/date-utils';
import { SummaryFilters } from '@pages/summary/summary-filters';
import { SummarySection } from '@pages/summary/summary-section';
import { SummaryTotalsBar } from '@pages/summary/summary-totals-bar';
import type { Summary } from '@serve/types/global';
import { ApiError, getSummary } from '@services/summary';

export function SummaryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeHousehold } = useActiveHousehold();

  const householdId = activeHousehold?.id;

  // Sanitise the month URL param — parseMonthStr falls back to the current
  // month on invalid input, so we re-derive the canonical string from the
  // parsed result to keep the URL and state consistent.
  const rawMonthParam = searchParams.get('month') ?? currentMonthStr();
  const { year: selectedYear, month: selectedMonth } = parseMonthStr(rawMonthParam);
  const monthParam = toMonthStr(selectedYear, selectedMonth);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'spending' | 'earnings'>('spending');

  // Earliest date comes from the last successful fetch — always household-wide,
  // unaffected by the month filter. Used to bound the year/month pickers.
  const earliestDate = summary?.earliest_transaction_date ?? null;

  const years = useMemo(() => yearRange(earliestDate), [earliestDate]);
  const months = useMemo(
    () => availableMonths(selectedYear, earliestDate),
    [selectedYear, earliestDate],
  );

  useEffect(() => {
    let ignore = false;

    if (householdId === undefined) {
      // Resets summary state; part of the same synchronize-with-fetch effect
      // as the loading branch below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummary(null);
      setIsLoading(false);
      return () => {
        ignore = true;
      };
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    getSummary({ household_id: householdId, month: monthParam })
      .then(data => {
        if (!ignore) setSummary(data);
      })
      .catch(err => {
        if (!ignore) {
          setError(err instanceof ApiError ? err.message : 'Could not load summary.');
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [householdId, monthParam]);

  function handleYearChange(year: number) {
    // Clamp selected month if it is not valid in the new year.
    const available = availableMonths(year, earliestDate);
    const newMonth = available.includes(selectedMonth) ? selectedMonth : available[0];
    if (newMonth !== undefined) {
      setSearchParams({ month: toMonthStr(year, newMonth) });
    }
  }

  function handleMonthChange(month: number) {
    setSearchParams({ month: toMonthStr(selectedYear, month) });
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 3 }}
          variant="text"
          color="inherit"
        >
          Dashboard
        </Button>

        <Typography variant="h4" sx={{ mb: 1 }}>
          Detailed Summary
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Transactions aggregated by label and category.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          <SwitchHouseholdButton />
          <SummaryFilters
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            years={years}
            availableMonths={months}
            onYearChange={handleYearChange}
            onMonthChange={handleMonthChange}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && summary != null && (
          <>
            <SummaryTotalsBar summary={summary} />

            <SummarySection
              summary={summary}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              monthLabel={formatMonthLabel(monthParam)}
            />

            {activeHousehold && (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                sx={{ mt: 4, textAlign: 'right' }}
              >
                {activeHousehold.name} · {formatMonthLabel(monthParam)}
              </Typography>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
