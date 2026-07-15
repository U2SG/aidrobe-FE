import { Image, Pressable, View } from 'react-native';

import { Card, Typography } from '@/components/ui';
import { SHOWCASE_WARDROBE } from '@/data/wardrobeShowcase';
import { useT } from '@/hooks/useT';
import { enableMvpV2Ui } from '@/lib/featureFlags';
import { colors, radius } from '@/theme/design';

// Empty-wardrobe state. Copy is sourced from i18n. Under V2 the sample-item grid
// is hidden (the brief bans surfacing canned example outfits) in favour of an
// honest low-friction "snap what you wear" empty state; V1 keeps the browsable
// grid unchanged.
export function WardrobeShowcaseEmpty({
  onAddItem,
  onOpenItem,
}: {
  onAddItem: () => void;
  onOpenItem: (id: string) => void;
}) {
  const { t } = useT();
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      <Typography variant="headline" color="label">
        {t('wardrobe.empty.title')}
      </Typography>
      <Typography variant="footnote" color="tertiaryLabel" style={{ marginTop: 6 }}>
        {t(enableMvpV2Ui ? 'wardrobe.empty.subtitleV2' : 'wardrobe.empty.subtitle')}
      </Typography>

      {enableMvpV2Ui ? null : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
          {SHOWCASE_WARDROBE.map((item) => (
            <Pressable key={item.id} onPress={() => onOpenItem(item.id)} style={{ width: '47%' }}>
              <Card padding={12} style={{ gap: 8 }}>
                <View
                  style={{
                    height: 130,
                    backgroundColor: colors.background,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image
                    source={item.image}
                    style={{ width: '100%', height: '100%', borderRadius: radius.md }}
                    resizeMode="contain"
                  />
                </View>
                <View>
                  <Typography variant="callout" color="label" numberOfLines={1} style={{ fontWeight: '600' }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="tertiaryLabel" numberOfLines={1} style={{ marginTop: 3 }}>
                    {item.tone}
                  </Typography>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        onPress={onAddItem}
        style={{
          height: 50,
          borderRadius: radius.lg,
          backgroundColor: colors.label,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 20,
        }}
      >
        <Typography variant="body" color="inverse" style={{ fontWeight: '600' }}>
          {t('wardrobe.empty.addFirst')}
        </Typography>
      </Pressable>
    </View>
  );
}
