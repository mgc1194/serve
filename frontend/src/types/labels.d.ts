// types/labels.d.ts — Label types.

export interface Label {
  id: number;
  name: string;
  color: string;
  category_id: number | null;
  household_id: number;
}