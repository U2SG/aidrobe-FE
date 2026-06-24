import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useToastStore } from '@/store/toast';

/**
 * 简单 toast 主机：监听 store，自动 dismiss。
 * 真实项目可换成 react-native-toast-message / sonner-native 等。
 */
export function ToastHost() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(dismiss, current.durationMs ?? 2500);
    return () => clearTimeout(id);
  }, [current, dismiss]);

  if (!current) return null;

  const bg =
    current.kind === 'error'
      ? 'bg-red-500'
      : current.kind === 'success'
        ? 'bg-emerald-500'
        : 'bg-ink-700';

  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-12 items-center px-6">
      <View className={`max-w-full rounded-xl px-4 py-2 ${bg}`}>
        <Text className="text-sm text-inverse">{current.message}</Text>
      </View>
    </View>
  );
}
