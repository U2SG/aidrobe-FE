import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getWardrobeItem } from '@/api/wardrobe';
import { resolveItemDisplayName } from '@/i18n/domainLabels';
import { useT } from '@/hooks/useT';

// Resolve a set of wardrobe-item ids to a id→display-name map. Dedups ids,
// shares the ['wardrobeItem', id] query key (so it dedups with item-detail
// fetches), and only re-fetches when the id set changes.
// Display names are resolved via resolveItemDisplayName so legacy items with
// English server titles surface a localized label for the current UI locale.
export function useWardrobeItemNames(ids: string[]): Map<string, string> {
  const { locale } = useT();
  const uniqueIds = useMemo(() => [...new Set(ids)], [ids]);
  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ['wardrobeItem', id],
      queryFn: () => getWardrobeItem(id),
      staleTime: 5 * 60 * 1000,
    })),
  });
  return useMemo(() => {
    const map = new Map<string, string>();
    queries.forEach((q, i) => {
      const id = uniqueIds[i];
      if (id && q.data) {
        const { name, nameSource, displayName, localizedNames, category, color, subCategory } = q.data;
        map.set(id, resolveItemDisplayName(locale, { name, nameSource, displayName, localizedNames, category, color, subCategory }));
      }
    });
    return map;
  }, [queries, uniqueIds, locale]);
}
