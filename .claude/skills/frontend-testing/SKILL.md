---
name: frontend-testing
description: >
  Write frontend unit tests for React + TypeScript components. Use when the
  user asks to "write tests", "add unit tests", "test this component", or
  similar. The stack is Vitest + React Testing Library + MSW, with
  @testing-library/jest-dom matchers.
---

# Frontend Testing Skill

## Stack

| Tool | Role |
|---|---|
| **Vitest** | Test runner and assertion library (`describe`, `it`, `expect`, `vi`) |
| **React Testing Library** | Rendering and DOM queries (`render`, `screen`, `fireEvent`, `waitFor`) |
| **@testing-library/user-event** | Realistic user interactions (`userEvent.setup()`) — prefer over `fireEvent` for typing and complex interactions |
| **MSW** | API mocking at the network layer (configured globally in `vitest.setup.ts`) |
| **@testing-library/jest-dom** | Extended matchers (`toBeInTheDocument` etc.) — available globally via setup |

## File Conventions

- Test files live next to the source file: `component.tsx` → `component.test.tsx`
- Import from `vitest`, never from `jest`
- Import render utilities from `@testing-library/react`
- Import factories from `@tests/factories` (not inline object literals for domain types)
- Wrap components that use `useNavigate` or `<Link>` in `<MemoryRouter>` from `react-router`

## Key Patterns

### Basic render test
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MyComponent } from './my-component';

describe('MyComponent', () => {
  it('renders the heading', () => {
    render(<MyComponent />);
    expect(screen.getByRole('heading', { name: /my heading/i })).toBeDefined();
  });
});
```

### Mocking modules
```tsx
import { vi } from 'vitest';
import { useAuth } from '@context/auth-context';

// Mock the whole module
vi.mock('@context/auth-context', () => ({ useAuth: vi.fn() }));

// Type-safe reference to the mock
const mockUseAuth = vi.mocked(useAuth);

// Set return value per test or in beforeEach
mockUseAuth.mockReturnValue({ user: mockUser, isLoading: false, setUser: vi.fn() });
```

### Mocking a single export while keeping the rest
```tsx
vi.mock('@services/households', async importOriginal => {
  const actual = await importOriginal<typeof import('@services/households')>();
  return { ...actual, deleteHousehold: vi.fn() };
});
```

### Mocking useNavigate
```tsx
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});
```

### Async interactions
```tsx
import { act, fireEvent, screen, waitFor } from '@testing-library/react';

// For async event handlers (e.g. onClick triggers an API call)
await act(async () => {
  fireEvent.click(screen.getByRole('button', { name: /submit/i }));
});

// Wait for something to appear after an async operation
await waitFor(() => expect(screen.getByText(/success/i)).toBeDefined());
```

### userEvent for realistic interactions (typing, complex clicks)
```tsx
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();
await user.type(screen.getByLabelText(/email/i), 'test@example.com');
await user.click(screen.getByRole('button', { name: /save/i }));
```

### Setup helper pattern
Keeps test bodies clean and props DRY:
```tsx
function setup(props: Partial<React.ComponentProps<typeof MyComponent>> = {}) {
  const onChange = vi.fn();
  render(<MyComponent onChange={onChange} {...props} />);
  return { onChange };
}
```

### Factory usage
Always use factories for domain objects — never write inline fixtures:
```tsx
import { makeUser, makeTransaction, makeLabel } from '@tests/factories';

const user = makeUser({ first_name: 'Alice' });
const tx = makeTransaction({ amount: -42.57, label_id: null });
```

### Assertions
- Use `.toBeDefined()` to assert an element exists (not `.toBeInTheDocument()` — jest-dom matchers behave slightly differently under Vitest and `.toBeDefined()` is the established convention in this codebase)
- Use `.toBeNull()` for "element should not exist": `screen.queryByText('foo').toBeNull()`
- Use `expect(fn).toHaveBeenCalledOnce()` and `expect(fn).toHaveBeenCalledWith(...)` for spy assertions

### AppHeader / auth-dependent components
Always mock both `@context/auth-context` and `@layout/app-header` when testing pages:
```tsx
vi.mock('@context/auth-context', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com', first_name: 'Test', last_name: 'User', username: 'test', households: [] },
    setUser: vi.fn(),
  }),
}));
vi.mock('@layout/app-header', () => ({ AppHeader: () => <header /> }));
```

### Loading states
Return a never-resolving Promise to freeze a component in its loading state:
```tsx
vi.spyOn(service, 'listHouseholds').mockReturnValue(new Promise(() => {}));
```

## What to Test

For each component, cover:
1. **Renders correctly** — key elements are present on initial render
2. **Conditional rendering** — elements that appear/disappear based on props or state
3. **User interactions** — clicks, input changes, form submissions
4. **Async outcomes** — loading states, success paths, error paths
5. **Callback props** — that `onX` callbacks are called with the right arguments

Do **not** test:
- Implementation details (internal state, private functions)
- Third-party library behaviour (MUI rendering internals)
- Trivial pass-through props

## describe / it Structure

Group by concern, not by method:
```tsx
describe('MyComponent rendering', () => { ... });
describe('MyComponent interactions', () => { ... });
describe('MyComponent error states', () => { ... });
```

## beforeEach

Use `beforeEach` to reset mocks and set default spy return values. Call `vi.clearAllMocks()` at minimum:
```tsx
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(service, 'listItems').mockResolvedValue([item]);
  mockNavigate.mockReset();
});
```