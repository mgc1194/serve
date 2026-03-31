// types/accounts.d.ts — Bank, account type, and account types.

export interface AccountType {
  id: number;
  name: string;
  handler_key: string;
}

export interface Bank {
  id: number;
  name: string;
  account_types: AccountType[];
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
