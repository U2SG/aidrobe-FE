import { Image, Text, View } from 'react-native';

import { useT } from '@/hooks/useT';
import { colors, radius, type } from '@/theme/design';

const SIZE = 60;

export interface ItemRefCardData {
  itemId: string;
  // Localized display name (preferred). When absent, falls back to
  // category/color labels.
  name?: string | null;
  category?: string | null;
  colorMain?: string | null;
  thumbnailUrl?: string | null;
}

interface Props {
  item: ItemRefCardData;
  size?: number;
}

// Reusable thumbnail tile for a referenced wardrobe item. Shows the signed
// thumbnail when present, otherwise a readable category/color fallback (never
// an empty gray box). Used by ItemRefsRow but reusable anywhere a compact item
// chip is needed.
export function ItemRefCard({ item, size = SIZE }: Props) {
  const { t, tEnum } = useT();
  const categoryLabel = item.category ? tEnum('category', item.category) : '';
  const fallbackLabel =
    item.name?.trim() ||
    [categoryLabel, item.colorMain].filter(Boolean).join(' · ') ||
    t('ask.itemFallback');

  return (
    <View style={{ width: size }} accessibilityLabel={fallbackLabel}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius.sm,
          backgroundColor: colors.secondaryElevated,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{ ...type.caption, color: colors.tertiaryLabel, paddingHorizontal: 4, textAlign: 'center' }}
            numberOfLines={2}
          >
            {categoryLabel || t('ask.itemFallback')}
          </Text>
        )}
      </View>
      <Text style={{ ...type.caption, color: colors.secondaryLabel, marginTop: 4 }} numberOfLines={1}>
        {fallbackLabel}
      </Text>
    </View>
  );
}
