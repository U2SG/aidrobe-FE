import { useRef } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';

import { SystemIcon } from '@/components/ui/SystemIcon';
import type { ShowcaseItem } from '@/data/wardrobeShowcase';

interface Props {
  title: string;
  countLabel: string;
  items: ShowcaseItem[];
  selectedIndex: number;
  onChange: (index: number) => void;
}

const CARD_WIDTH = 150;
const CARD_GAP = 12;

export function OutfitCarouselLane({ title, countLabel, items, selectedIndex, onChange }: Props) {
  const listRef = useRef<FlatList<ShowcaseItem>>(null);

  const move = (direction: -1 | 1) => {
    const next = (selectedIndex + direction + items.length) % items.length;
    onChange(next);
    listRef.current?.scrollToIndex({ index: next, animated: true, viewPosition: 0.5 });
  };

  return (
    <View className="border-b border-closet-border pb-4 last:border-b-0">
      <View className="mb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-lg font-semibold text-closet-ink">{title}</Text>
          <Text className="mt-0.5 text-xs text-closet-muted">{countLabel}</Text>
        </View>
        <View className="flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`上一件${title}`}
            onPress={() => move(-1)}
            className="h-10 w-10 items-center justify-center rounded-full border border-closet-border bg-closet-panel"
          >
            <SystemIcon name="chevronLeft" size={18} color="#111113" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`下一件${title}`}
            onPress={() => move(1)}
            className="h-10 w-10 items-center justify-center rounded-full border border-closet-border bg-closet-panel"
          >
            <SystemIcon name="chevronRight" size={18} color="#111113" />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        horizontal
        data={items}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={{ gap: CARD_GAP, paddingRight: 20 }}
        onMomentumScrollEnd={(event) => {
          const raw = event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP);
          const next = Math.max(0, Math.min(items.length - 1, Math.round(raw)));
          onChange(next);
        }}
        getItemLayout={(_, index) => ({
          length: CARD_WIDTH + CARD_GAP,
          offset: (CARD_WIDTH + CARD_GAP) * index,
          index,
        })}
        renderItem={({ item, index }) => {
          const selected = index === selectedIndex;
          return (
            <Pressable
              onPress={() => onChange(index)}
              className={`w-[150px] overflow-hidden rounded-[22px] border bg-closet-panel ${
                selected ? 'border-closet-sage' : 'border-closet-border'
              }`}
            >
              <View className="h-[142px] items-center justify-center bg-closet-cream">
                <Image source={item.image} className="h-full w-full" resizeMode="contain" />
              </View>
              <View className="px-3 pb-3 pt-2">
                <Text numberOfLines={1} className="text-sm font-semibold text-closet-ink">
                  {item.name}
                </Text>
                <Text numberOfLines={1} className="mt-0.5 text-xs text-closet-muted">
                  {item.tone}
                </Text>
              </View>
              {selected ? (
                <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-closet-sage">
                  <SystemIcon name="check" size={15} color="#fff" strokeWidth={2.3} />
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}
