// pages/budgets/create-budget-form.tsx
//
// Inline creation form, mirroring households/create-household-form.tsx's
// shape, extended for a required type and (for spending/earning budgets) a
// From/To period range using the same DatePicker + dayjs pattern already
// established in transactions/date-range-filter.tsx.

import AddIcon from '@mui/icons-material/Add';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { type Dayjs } from 'dayjs';
import { useRef, useState } from 'react';

import type { Budget } from '@serve/types/global';
import { createBudget, ApiError } from '@services/budgets';

const DATE_FORMAT = 'YYYY-MM-DD';

function toDayjs(value: string | undefined): Dayjs | null {
  return value ? dayjs(value, DATE_FORMAT, true) : null;
}

function toDateString(value: Dayjs | null): string | undefined {
  return value?.isValid() ? value.format(DATE_FORMAT) : undefined;
}

type BudgetType = 'spending' | 'earning' | 'project';

interface CreateBudgetFormProps {
  householdId: number;
  onCreate: (budget: Budget) => void;
}

export function CreateBudgetForm({ householdId, onCreate }: CreateBudgetFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<BudgetType>('spending');
  const [periodStart, setPeriodStart] = useState<string | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<string | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setError(null);
    try {
      const created = await createBudget({
        name: trimmed,
        type,
        household_id: householdId,
        period_start: type === 'project' ? undefined : periodStart,
        period_end: type === 'project' ? undefined : periodEnd,
      });
      onCreate(created);
      setName('');
      setPeriodStart(undefined);
      setPeriodEnd(undefined);
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create budget.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <OutlinedInput
            inputRef={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Budget name"
            inputProps={{ 'aria-label': 'Budget name' }}
            size="small"
            disabled={isCreating}
            sx={{ flex: 1, minWidth: 180 }}
          />

          <FormControl size="small" disabled={isCreating} sx={{ minWidth: 140 }}>
            <InputLabel id="budget-type-label">Type</InputLabel>
            <Select
              labelId="budget-type-label"
              label="Type"
              value={type}
              onChange={e => setType(e.target.value as BudgetType)}
            >
              <MenuItem value="spending">Spending</MenuItem>
              <MenuItem value="earning">Earning</MenuItem>
              <MenuItem value="project">Project</MenuItem>
            </Select>
          </FormControl>

          {type !== 'project' && (
            <>
              <DatePicker
                label="From"
                format={DATE_FORMAT}
                value={toDayjs(periodStart)}
                onChange={value => setPeriodStart(toDateString(value))}
                disabled={isCreating}
                maxDate={toDayjs(periodEnd) ?? undefined}
                slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
              />
              <DatePicker
                label="To"
                format={DATE_FORMAT}
                value={toDayjs(periodEnd)}
                onChange={value => setPeriodEnd(toDateString(value))}
                disabled={isCreating}
                minDate={toDayjs(periodStart) ?? undefined}
                slotProps={{ textField: { size: 'small', sx: { width: 150 } } }}
              />
            </>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={isCreating ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
            onClick={handleCreate}
            disabled={
              !name.trim() ||
              isCreating ||
              (type !== 'project' && (!periodStart || !periodEnd))
            }
          >
            Create
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
