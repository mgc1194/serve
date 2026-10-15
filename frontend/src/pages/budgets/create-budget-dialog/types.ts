// pages/budgets/create-budget-dialog/types.ts
//
// UI-only distinction — both 'monthly' and 'period' send type: 'period' to
// the backend, which has no concept of "monthly".
export type UiBudgetType = 'monthly' | 'period' | 'project';
