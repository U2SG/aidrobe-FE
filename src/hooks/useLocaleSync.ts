import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getUserSettings } from '@/api/settings';
import { useLocalePrefStore } from '@/store/localePref';

// On app entry (after login, where MainTabs mounts), adopt the user's
// server-stored language so EVERY tab renders in it from the start — not only
// after the user opens Settings. Only adopts when the local store is still at
// its default 'system', so an explicit local choice is never clobbered. Shares
// the ['userSettings'] query cache, so this adds no extra fetch.
export function useLocaleSync() {
  const preference = useLocalePrefStore((s) => s.preference);
  const setPreference = useLocalePrefStore((s) => s.setPreference);
  const { data } = useQuery({ queryKey: ['userSettings'], queryFn: getUserSettings });
  const serverLocale = data?.locale ?? null;

  useEffect(() => {
    if (serverLocale && preference === 'system' && serverLocale !== 'system') {
      setPreference(serverLocale);
    }
    // Run when the server value arrives; intentionally not depending on
    // `preference` so a later manual switch back to 'system' isn't re-overwritten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverLocale]);
}
