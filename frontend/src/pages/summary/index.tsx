// pages/summary/index.tsx — Detailed summary page.
//
// Orchestrates data fetching and URL-driven filter state.
// Rendering is delegated to SummaryFilters, SummaryTotalsBar, and SummarySection.

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Alert, Box, Button, CircularProgress, Container, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { useAuth } from '@context/auth-context';
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
import type { Household, Summary } from '@serve/types/global';
import { ApiError, getSummary } from '@services/summary';

export function SummaryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const households: Household[] = useMemo(() => user?.households ?? [], [user]);

  const householdIdParam = searchParams.get('household_id');
  const householdIdFilter: number | undefined = (() => {
    if (householdIdParam == null || householdIdParam.trim() === '') return undefined;
    const parsed = Number(householdIdParam);
    return Number.isNaN(parsed) ? undefined : parsed;
  })();

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

  // Redirect to first household when none is selected yet.
  useEffect(() => {
    if (householdIdFilter === undefined && households.length > 0) {
      setSearchParams(
        { household_id: String(households[0].id), month: monthParam },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [households]);

  useEffect(() => {
    if (householdIdFilter === undefined) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    getSummary({ household_id: householdIdFilter, month: monthParam })
      .then(data => setSummary(data))
      .catch(err => {
        setError(err instanceof ApiError ? err.message : 'Could not load summary.');
      })
      .finally(() => setIsLoading(false));
  }, [householdIdFilter, monthParam]);

  function handleHouseholdChange(id: number) {
    setSearchParams({ household_id: String(id), month: monthParam });
  }

  function handleYearChange(year: number) {
    // Clamp selected month if it is not valid in the new year.
    const available = availableMonths(year, earliestDate);
    const newMonth = available.includes(selectedMonth) ? selectedMonth : available[0];
    if (newMonth !== undefined) {
      const params: Record<string, string> = { month: toMonthStr(year, newMonth) };
      if (householdIdFilter != null) params.household_id = String(householdIdFilter);
      setSearchParams(params);
    }
  }

  function handleMonthChange(month: number) {
    const params: Record<string, string> = { month: toMonthStr(selectedYear, month) };
    if (householdIdFilter != null) params.household_id = String(householdIdFilter);
    setSearchParams(params);
  }

  const activeHousehold = households.find(h => h.id === householdIdFilter);

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

        <SummaryFilters
          households={households}
          householdId={householdIdFilter}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          years={years}
          availableMonths={months}
          onHouseholdChange={handleHouseholdChange}
          onYearChange={handleYearChange}
          onMonthChange={handleMonthChange}
        />

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
