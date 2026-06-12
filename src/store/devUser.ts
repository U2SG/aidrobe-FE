import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { create } from 'zustand';

const KEY = 'aidrobe.devUserId';

interface DevUserState {
  userId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setUserId: (id: string) => Promise<void>;
}

const fallback: string =
  (Constants.expoConfig?.extra as { DEV_USER_ID?: string })?.DEV_USER_ID ??
  '00000000-0000-4000-8000-000000000001';

export const useDevUserStore = create<DevUserState>((set) => ({
  userId: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(KEY);
      if (stored) {
        set({ userId: stored, hydrated: true });
        return;
      }
    } catch {
      // SecureStore 不可用时降级
    }
    await SecureStore.setItemAsync(KEY, fallback).catch(() => undefined);
    set({ userId: fallback, hydrated: true });
  },
  setUserId: async (id) => {
    await SecureStore.setItemAsync(KEY, id).catch(() => undefined);
    set({ userId: id });
  },
}));
