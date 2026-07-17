import { useQueries } from '@tanstack/react-query';
import { ScrollView, Text, View } from 'react-native';

import { getWardrobeItem } from '@/api/wardrobe';
import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';
import type { AskItemRefSnapshot } from '@/types/api';

import { ItemRefCard, ITEM_REF_CARD_SIZE, type ItemRefCardData } from './ItemRefCard';

// Cap on how many tiles render before collapsing into "还有 N 件".
const VISIBLE_CAP = 8;
// Cap on the fallback detail fetch — we never fan out useQueries over dozens of
// ids. When snapshots are present (the BE#29 default) this fetches nothing.
const FALLBACK_FETCH_CAP = 6;

interface Props {
  // Preferred source: denormalized snapshots from the Ask API (no fetch).
  snapshots?: AskItemRefSnapshot[];
  // Fallback when snapshots are unavailable (older payloads). Only the first
  // FALLBACK_FETCH_CAP ids are resolved to avoid an N+1.
  ids?: string[];
}

// Horizontal row of referenced wardrobe items. Prefers BE snapshots; falls back
// to a capped per-item fetch. Empty → renders nothing. Reusable outside Ask.
export function ItemRefsRow({ snapshots, ids = [] }: Props) {
  const { t } = useT();

  const hasSnapshots = (snapshots?.length ?? 0) > 0;
  // Hooks must run unconditionally; an empty id list yields zero queries.
  const fetchIds = hasSnapshots ? [] : ids.slice(0, FALLBACK_FETCH_CAP);
  const fetched = useQueries({
    queries: fetchIds.map((id) => ({
      queryKey: ['wardrobeItem', id],
      queryFn: () => getWardrobeItem(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  let cards: ItemRefCardData[];
  if (hasSnapshots) {
    cards = (snapshots ?? []).map((s) => ({
      itemId: s.itemId,
      name: s.name,
      category: s.category,
      colorMain: s.colorMain,
      thumbnailUrl: s.thumbnailUrl,
    }));
  } else {
    cards = fetchIds.map((id, i) => {
      const item = fetched[i]?.data;
      return {
        itemId: id,
        name: item?.name ?? null,
        category: item?.category ?? null,
        colorMain: item?.color ?? null,
        thumbnailUrl: item?.imageUrl ?? null,
      };
    });
  }

  if (cards.length === 0) return null;

  const visible = cards.slice(0, VISIBLE_CAP);
  // True total of referenced items — in fallback mode we only fetch the first
  // FALLBACK_FETCH_CAP, so count from the original ids to keep the overflow
  // indicator honest.
  const total = hasSnapshots ? cards.length : ids.length;
  const overflow = total - visible.length;

  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ ...type.caption, color: colors.tertiaryLabel, marginBottom: 6 }}>
        {t('ask.relatedItems')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {visible.map((card) => (
          <ItemRefCard key={card.itemId} item={card} />
        ))}
        {overflow > 0 ? (
          <View
            style={{
              width: ITEM_REF_CARD_SIZE,
              height: ITEM_REF_CARD_SIZE,
              borderRadius: radius.sm,
              backgroundColor: colors.secondaryElevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ ...type.caption, color: colors.secondaryLabel }}>
              {t('ask.moreItems', { count: overflow })}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
