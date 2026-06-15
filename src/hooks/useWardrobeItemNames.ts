import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { getWardrobeItem } from '@/api/wardrobe';

// Resolve a set of wardrobe-item ids to a id→name map. Dedups ids, shares the
// ['wardrobeItem', id] query key (so it dedups with item-detail fetches), and
// only re-fetches when the id set changes.
export function useWardrobeItemNames(ids: string[]): Map<string, string> {
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
      if (id && q.data) map.set(id, q.data.name);
    });
    return map;
  }, [queries, uniqueIds]);
}
