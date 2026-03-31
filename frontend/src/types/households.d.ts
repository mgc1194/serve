// types/households.d.ts — Household and member types.

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