// types/global.d.ts — Re-exports all domain types.
//
// All existing imports (`from '@serve/types/global'`) continue to work
// unchanged. Add new domain type files to src/types/ and re-export them here.

export type { ApiError } from '@serve/types/api';
export type { AccountDetail, AccountType, Bank } from '@serve/types/accounts';
export type { User, LoginRequest, RegisterRequest } from '@serve/types/auth';
export type { Household, HouseholdDetail, HouseholdMember } from '@serve/types/households';
export type { Label } from '@serve/types/labels';
export type { CategorySummary, LabelSummary, Summary } from '@serve/types/summary';
export type { FileImportResult, Transaction } from '@serve/types/transactions';
