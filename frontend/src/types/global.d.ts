// types/global.d.ts — Global TypeScript types matching Django API schemas.

export interface Household {
  id: number;
  name: string;
}

export interface HouseholdMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface HouseholdDetail {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  members: HouseholdMember[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  households: Household[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirm_password: string;
  first_name?: string;
  last_name?: string;
}

export interface AccountType {
  id: number;
  name: string;
  handler_key: string;
}

export interface AccountDetail {
  id: number;
  name: string;
  handler_key: string;
  account_type_id: number;
  account_type: string;
  bank_id: number;
  bank_name: string;
  household_id: number;
  household_name: string;
  created_at: string;
  updated_at: string;
}

export interface Bank {
  id: number;
  name: string;
  account_types: AccountType[];
}

// Labels types
export interface Label {
  id: number;
  name: string;
  color: string;
  category: string;
  household_id: number;
}

// Transactions types
export interface Transaction {
  id: number;
  date: string;
  concept: string;
  amount: number;
  label_id: number | null;
  label_name: string | null;
  label_color: string | null;
  category: string | null;
  additional_labels: string | null;
  source: string;
  account_id: number;
  account_name: string;
  bank_name: string;
  imported_at: string;
}

export interface FileImportResult {
  filename: string;
  inserted: number;
  skipped: number;
  total: number;
  error: string | null;
}

// Summary types
export interface LabelSummary {
  label_id: number;
  label_name: string;
  label_color: string;
  category: string;
  total: number;
}
 
export interface CategorySummary {
  category: string;
  total: number;
  labels: LabelSummary[];
}
 
export interface Summary {
  earnings: CategorySummary[];
  spending: CategorySummary[];
  total: number;
  balance: number;
  uncategorised_total: number;
  /** ISO date string "YYYY-MM-DD" of the oldest transaction in the household, or null. */
  earliest_transaction_date: string | null;
}


// Returned by the API on errors (Django Ninja's default error shape).
export interface ApiError {
  detail: string;
}
