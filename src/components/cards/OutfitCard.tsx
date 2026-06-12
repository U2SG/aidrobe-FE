import { Pressable, Text, View } from 'react-native';

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

export function OutfitCard({ outfit, selected, onPress, onWear }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-4 rounded-2xl border bg-white p-4 ${
        selected ? 'border-brand-600' : 'border-ink-100'
      }`}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-base font-semibold text-ink-900">{outfit.title}</Text>
        <Text className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
          {VARIANT_LABEL[outfit.variant]}
        </Text>
      </View>
      <Text className="mb-3 text-sm text-ink-500">{outfit.reason}</Text>

      <View className="mb-3 flex-row gap-2">
        {outfit.items.slice(0, 4).map((item) => (
          <View
            key={item.id}
            className="h-16 w-16 items-center justify-center rounded-lg bg-ink-100"
          >
            <Text className="text-xs text-ink-500">{item.category ?? 'item'}</Text>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onWear}
        className="h-10 items-center justify-center rounded-lg bg-brand-600 active:bg-brand-700"
      >
        <Text className="text-sm font-semibold text-white">今天穿这套</Text>
      </Pressable>
    </Pressable>
  );
}
