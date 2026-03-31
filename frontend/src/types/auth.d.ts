// types/auth.d.ts — User and authentication types.

import type { Household } from '@serve/types/households';

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
