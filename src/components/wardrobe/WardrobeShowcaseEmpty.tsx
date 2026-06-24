import { Image, Pressable, View } from 'react-native';

import { Card, Typography } from '@/components/ui';
import { SHOWCASE_WARDROBE } from '@/data/wardrobeShowcase';
import { colors, radius } from '@/theme/design';

// V4.1 P1 — empty-wardrobe showcase. FE#32: item cards use the Card primitive
// (its elevated/lg/soft-shadow defaults match the prior inline values) and text
// uses Typography. The bespoke CTA keeps its lg radius.
export function WardrobeShowcaseEmpty({
  onAddItem,
  onOpenItem,
}: {
  onAddItem: () => void;
  onOpenItem: (id: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      <Typography variant="headline" color="label">
        衣橱还是空的
      </Typography>
      <Typography variant="footnote" color="tertiaryLabel" style={{ marginTop: 6 }}>
        先看看示例衣橱 —— 点任意一件感受单品详情和「用这件搭一套」，准备好就添加你自己的。
      </Typography>

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

      <Pressable
        onPress={onAddItem}
        style={({ pressed }) => ({
          height: 50,
          borderRadius: radius.lg,
          backgroundColor: colors.label,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 20,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Typography variant="body" color="inverse" style={{ fontWeight: '600' }}>
          添加我的第一件衣物
        </Typography>
      </Pressable>
    </View>
  );
}
