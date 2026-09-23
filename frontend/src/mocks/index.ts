// src/mocks/index.ts — Re-exports all test mocks.
//
// Import from '@serve/mocks' in test files and Storybook stories.
// Adding a new required field to a domain type only requires updating the
// corresponding factory here — not every test or story that uses it.
 
export { makeAccount, makeAccountType, makeBank } from '@serve/mocks/accounts';
export { makeUser } from '@serve/mocks/auth';
export { makeBudget } from '@serve/mocks/budgets';
export { makeHousehold, makeHouseholdDetail, makeHouseholdMember } from '@serve/mocks/households';
export { makeLabel } from '@serve/mocks/labels';
export { makeFileImportResult, makeTransaction } from '@serve/mocks/transactions';