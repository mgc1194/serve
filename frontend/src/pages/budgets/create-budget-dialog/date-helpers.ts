// pages/budgets/create-budget-dialog/date-helpers.ts — Conversions between
// the "YYYY-MM-DD" strings the API expects and the Dayjs values the MUI
// DatePicker fields work with.

import dayjs, { type Dayjs } from 'dayjs';

export const DATE_FORMAT = 'YYYY-MM-DD';

export function toDayjs(value: string | undefined): Dayjs | null {
  return value ? dayjs(value, DATE_FORMAT, true) : null;
}

export function toDateString(value: Dayjs | null): string | undefined {
  return value?.isValid() ? value.format(DATE_FORMAT) : undefined;
}
