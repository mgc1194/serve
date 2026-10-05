// types/categories.d.ts — Category types.

export interface Category {
  id: number;
  name: string;
  type: 'earning' | 'spending';
  is_active: boolean;
  household_id: number;
}
