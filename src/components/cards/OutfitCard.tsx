import { View } from 'react-native';

import { Badge, Button, Card, Typography } from '@/components/ui';
import { colors, radius } from '@/theme/design';
import type { OutfitSummary, OutfitVariant } from '@/types/api';

const VARIANT_LABEL: Record<OutfitVariant, string> = {
  safe: '稳妥',
  fast: '快速',
  stylish: '有风格',
};

interface Props {
  outfit: OutfitSummary;
  selected?: boolean;
  onPress: () => void;
  onWear: () => void;
}

// FE#32 — migrated off the legacy NativeWind brand-*/ink-* palette onto the
// design-token primitives (Card/Badge/Typography/Button). Colors normalize to
// the token palette (selection uses `accent`); visually near-identical but
// not pixel-verified — see PR.
export function OutfitCard({ outfit, selected, onPress, onWear }: Props) {
  return (
    <Card
      onPress={onPress}
      variant="flat"
      radius={16}
      bordered
      style={{ marginBottom: 16, borderColor: selected ? colors.accent : colors.borderSubtle }}
    >
      <View
        style={{
          marginBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="headline" color="label">
          {outfit.title}
        </Typography>
        <Badge tone="accent" label={VARIANT_LABEL[outfit.variant] ?? outfit.variant} />
      </View>
      <Typography variant="callout" color="tertiaryLabel" style={{ marginBottom: 12 }}>
        {outfit.reason}
      </Typography>

      <View style={{ marginBottom: 12, flexDirection: 'row', gap: 8 }}>
        {outfit.items.slice(0, 4).map((item) => (
          <View
            key={item.id}
            style={{
              height: 64,
              width: 64,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              backgroundColor: colors.fill,
            }}
          >
            <Typography variant="caption" color="tertiaryLabel">
              {item.category ?? 'item'}
            </Typography>
          </View>
        ))}
      </View>

      <Button label="今天穿这套" onPress={onWear} variant="primary" size="sm" />
    </Card>
  );
}
