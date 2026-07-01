import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  initialPromptFrequencyState,
  recordPassiveWearAnswered,
  recordPassiveWearIgnored,
  recordPassiveWearShown,
  recordResurfaceShown,
  type PromptFrequencyState,
} from '@/state/promptFrequency';

// Persisted holder for the passive-prompt frequency-cap state. The decision +
// reducer logic lives in the pure module (src/state/promptFrequency.ts); this is
// just storage + `Date.now()` plumbing. Read caps at call sites with the pure
// canShow* helpers against `usesPromptFrequencyStore.getState()`.
interface PromptFrequencyStore extends PromptFrequencyState {
  hydrated: boolean;
  markPassiveWearShown: () => void;
  markPassiveWearIgnored: () => void;
  markPassiveWearAnswered: () => void;
  markResurfaceShown: (itemId: string) => void;
  _setHydrated: () => void;
}

export const usePromptFrequencyStore = create<PromptFrequencyStore>()(
  persist(
    (set) => ({
      ...initialPromptFrequencyState(),
      hydrated: false,
      markPassiveWearShown: () =>
        set((s) => ({ passiveWear: recordPassiveWearShown(s.passiveWear, Date.now()) })),
      markPassiveWearIgnored: () =>
        set((s) => ({ passiveWear: recordPassiveWearIgnored(s.passiveWear, Date.now()) })),
      markPassiveWearAnswered: () =>
        set((s) => ({ passiveWear: recordPassiveWearAnswered(s.passiveWear) })),
      markResurfaceShown: (itemId) =>
        set((s) => ({ resurface: recordResurfaceShown(s.resurface, Date.now(), itemId) })),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'aidrobe.promptFrequency',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ passiveWear: s.passiveWear, resurface: s.resurface }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
