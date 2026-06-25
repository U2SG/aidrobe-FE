import { Image, View } from 'react-native';

import { Badge, Card, Typography } from '@/components/ui';
import { colors } from '@/theme/design';
import type { WardrobeItem } from '@/types/api';

interface Props {
  item: WardrobeItem;
  onPress: () => void;
}

// FE#32 — migrated off the legacy NativeWind palette onto token primitives
// (Card/Badge/Typography). Image is flush, so the card uses padding=0 with an
// inner padded block. Normalized colors; not pixel-verified — see PR.
export function WardrobeItemCard({ item, onPress }: Props) {
  return (
    <Card
      onPress={onPress}
      variant="flat"
      radius={16}
      bordered
      padding={0}
      style={{ flex: 1, overflow: 'hidden', marginBottom: 12 }}
    >
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.fill }}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={{ height: '100%', width: '100%' }} resizeMode="cover" />
        ) : null}
      </View>
      <View style={{ padding: 8 }}>
        <Typography variant="callout" color="label" numberOfLines={1} style={{ fontWeight: '500' }}>
          {item.name}
        </Typography>
        <View
          style={{
            marginTop: 4,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="tertiaryLabel">
            {item.color}
          </Typography>
          {item.status === 'unavailable' ? <Badge tone="neutral" label="暂不可用" /> : null}
        </View>
      </View>
    </Card>
  );
}
