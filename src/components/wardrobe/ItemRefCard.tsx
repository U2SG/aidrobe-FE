import { Text, View } from 'react-native';

import { ImageThumb } from '@/components/ui/ImageThumb';
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
  const colorLabel = item.colorMain ? tEnum('color', item.colorMain) : '';
  const fallbackLabel =
    item.name?.trim() ||
    [categoryLabel, colorLabel].filter(Boolean).join(' · ') ||
    t('ask.itemFallback');

  return (
    <View style={{ width: size }} accessibilityLabel={fallbackLabel}>
      <ImageThumb
        uri={item.thumbnailUrl}
        size={size}
        cornerRadius={radius.sm}
        fallbackLabel={categoryLabel || colorLabel || t('ask.itemFallback')}
        accessibilityLabel={fallbackLabel}
      />
      <Text style={{ ...type.caption, color: colors.secondaryLabel, marginTop: 4 }} numberOfLines={1}>
        {fallbackLabel}
      </Text>
    </View>
  );
}
