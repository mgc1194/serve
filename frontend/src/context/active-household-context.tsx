// context/active-household-context.tsx — Session-wide active household.
//
// Replaces the per-page `household_id` URL parsing that used to be
// duplicated (and inconsistent) across AccountsPage, SummaryPage, and
// TransactionsPage. Mounted inside AuthProvider in App.tsx since it needs
// `user.households`.
//
// Default is deterministic (alphabetically-first household) rather than a
// backend-persisted preference — see issue #263. The chosen id is persisted
// to localStorage per user so it survives reloads on the same browser.
//
// Resolution is a pure render-time computation (no effect) so a page never
// renders a transient "no household" state before settling on the real one.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useAuth } from '@context/auth-context';
import type { Household } from '@serve/types/global';

interface ActiveHouseholdContextValue {
  activeHousehold: Household | null;
  households: Household[];
  setActiveHousehold: (household: Household) => void;
}

const ActiveHouseholdContext = createContext<ActiveHouseholdContextValue | null>(null);

function storageKey(userId: number): string {
  return `serve:activeHouseholdId:${userId}`;
}

function alphabeticalFirst(households: Household[]): Household | null {
  if (households.length === 0) return null;
  return [...households].sort((a, b) => a.name.localeCompare(b.name))[0];
}

function readStoredId(userId: number): number | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    // localStorage may be unavailable (private browsing, disabled cookies) —
    // fall back to the deterministic default below.
    return null;
  }
}

function writeStoredId(userId: number, householdId: number): void {
  try {
    localStorage.setItem(storageKey(userId), String(householdId));
  } catch {
    // Active household just won't persist across reloads.
  }
}

interface ActiveHouseholdProviderProps {
  children: ReactNode;
}

export function ActiveHouseholdProvider({ children }: ActiveHouseholdProviderProps) {
  const { user } = useAuth();
  const households: Household[] = useMemo(() => user?.households ?? [], [user]);
  const userId = user?.id ?? null;

  // An in-session choice made via setActiveHousehold(), tagged with the user
  // it was made for so it doesn't leak across a logout/login. Falls through
  // to the stored/default household below until the user picks one.
  const [explicit, setExplicit] = useState<{ userId: number | null; householdId: number } | null>(
    null,
  );
  const explicitId = explicit && explicit.userId === userId ? explicit.householdId : null;
  const hasValidExplicitId = explicitId !== null && households.some(h => h.id === explicitId);

  const storedId = userId !== null ? readStoredId(userId) : null;
  const hasValidStoredId = storedId !== null && households.some(h => h.id === storedId);

  const fallback = alphabeticalFirst(households);

  const resolvedId =
    (hasValidExplicitId ? explicitId : null) ??
    (hasValidStoredId ? storedId : null) ??
    (fallback?.id ?? null);

  const activeHousehold = households.find(h => h.id === resolvedId) ?? null;

  // The alphabetical-first fallback is recomputed from the current household
  // list every render, so it must be persisted the first time it's used —
  // otherwise renaming or creating a household that now sorts earlier would
  // silently change the active household on the next render, even though the
  // user never switched. Once persisted, hasValidStoredId is true and this
  // no-ops. Guarded on hasValidExplicitId (not merely explicitId !== null) so
  // that an explicit pick which is later deleted doesn't permanently block
  // the fallback from ever being persisted.
  useEffect(() => {
    if (userId === null || hasValidExplicitId || hasValidStoredId || !fallback) return;
    writeStoredId(userId, fallback.id);
  }, [userId, hasValidExplicitId, hasValidStoredId, fallback]);

  function setActiveHousehold(household: Household) {
    setExplicit({ userId, householdId: household.id });
    if (userId !== null) writeStoredId(userId, household.id);
  }

  return (
    <ActiveHouseholdContext.Provider value={{ activeHousehold, households, setActiveHousehold }}>
      {children}
    </ActiveHouseholdContext.Provider>
  );
}

export function useActiveHousehold(): ActiveHouseholdContextValue {
  const context = useContext(ActiveHouseholdContext);
  if (!context) {
    throw new Error('useActiveHousehold must be used within an ActiveHouseholdProvider');
  }
  return context;
}
