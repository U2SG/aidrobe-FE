import { Image, Pressable, Text, View } from 'react-native';

import type { WardrobeItem } from '@/types/api';

interface Props {
  item: WardrobeItem;
  onPress: () => void;
}

export function WardrobeItemCard({ item, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-1 overflow-hidden rounded-2xl border border-ink-100 bg-white"
    >
      <View className="aspect-square w-full bg-ink-100">
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} className="h-full w-full" resizeMode="cover" />
        ) : null}
      </View>
      <View className="p-2">
        <Text numberOfLines={1} className="text-sm font-medium text-ink-900">
          {item.name}
        </Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-xs text-ink-500">{item.color}</Text>
          {item.status === 'unavailable' ? (
            <Text className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] text-ink-500">
              暂不可用
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
