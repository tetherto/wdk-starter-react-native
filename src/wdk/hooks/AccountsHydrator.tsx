import { useEffect } from 'react';
import { useAccounts } from '@/state/accounts';

/**
 * Loads the persisted account list once at app startup. Mount this once at
 * the root, alongside AutoLockOnBackground/WdkSessionGate — same pattern.
 * Until hydration completes, useAccounts() serves its in-memory defaults
 * (a single "Account 1" at index 0), so nothing breaks while this runs;
 * it just corrects itself once the real persisted list loads.
 */
export function AccountsHydrator() {
  const hydrate = useAccounts((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}

export default AccountsHydrator;
