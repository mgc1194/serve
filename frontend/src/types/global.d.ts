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

// Returned by the API on errors (Django Ninja's default error shape).
export interface ApiError {
  detail: string;
}
