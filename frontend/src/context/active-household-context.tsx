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

  const [activeHouseholdId, setActiveHouseholdId] = useState<number | null>(null);

  // Resolve the active household whenever the signed-in user (or their
  // households) changes: prefer the stored id, falling back to the
  // alphabetical-first household when nothing is stored or the stored id no
  // longer matches one of the user's current households.
  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveHouseholdId(null);
      return;
    }

    const storedId = readStoredId(user.id);
    const stored = households.find(h => h.id === storedId);

    setActiveHouseholdId(stored ? stored.id : (alphabeticalFirst(households)?.id ?? null));
  }, [user, households]);

  function setActiveHousehold(household: Household) {
    setActiveHouseholdId(household.id);
    if (user) writeStoredId(user.id, household.id);
  }

  const activeHousehold = households.find(h => h.id === activeHouseholdId) ?? null;

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
