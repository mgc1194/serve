// types/global.d.ts — Global TypeScript types matching Django API schemas.

export interface Household {
  id: number;
  name: string;
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

// Returned by the API on errors (Django Ninja's default error shape).
export interface ApiError {
  detail: string;
}
