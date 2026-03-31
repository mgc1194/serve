// types/api.d.ts — Shared API response types.

/** Returned by the API on errors (Django Ninja's default error shape). */
export interface ApiError {
  detail: string;
}
