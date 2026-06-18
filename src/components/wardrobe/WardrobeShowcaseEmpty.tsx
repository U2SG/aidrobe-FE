import { Image, Pressable, Text, View } from 'react-native';

import { SHOWCASE_WARDROBE } from '@/data/wardrobeShowcase';
import { colors, radius, shadow } from '@/theme/design';

const T = {
  card: colors.elevated,
  cardInner: colors.background,
  ink: colors.label,
  ink2: colors.secondaryLabel,
  ink3: colors.tertiaryLabel,
};

// V4.1 P1 — empty-wardrobe showcase. Instead of a bare empty state, show the
// local sample garments so a brand-new user can see what a filled wardrobe (and
// the item-detail / "用这件搭一套" flow) looks like. Tapping a card opens
// ItemDetail, which already renders showcase items by id.
export function WardrobeShowcaseEmpty({
  onAddItem,
  onOpenItem,
}: {
  onAddItem: () => void;
  onOpenItem: (id: string) => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      <Text style={{ fontSize: 17, fontWeight: '600', color: T.ink }}>衣橱还是空的</Text>
      <Text style={{ fontSize: 13, color: T.ink3, marginTop: 6, lineHeight: 19 }}>
        先看看示例衣橱 —— 点任意一件感受单品详情和「用这件搭一套」，准备好就添加你自己的。
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
        {SHOWCASE_WARDROBE.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onOpenItem(item.id)}
            style={{ width: '47%' }}
          >
            <View style={{ backgroundColor: T.card, borderRadius: radius.lg, padding: 12, gap: 8, ...shadow.soft }}>
              <View
                style={{
                  height: 130,
                  backgroundColor: T.cardInner,
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
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: T.ink }}>
                  {item.name}
                </Text>
                <Text numberOfLines={1} style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>
                  {item.tone}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={onAddItem}
        style={({ pressed }) => ({
          height: 50,
          borderRadius: radius.lg,
          backgroundColor: T.ink,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 20,
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>添加我的第一件衣物</Text>
      </Pressable>
    </View>
  );
}
