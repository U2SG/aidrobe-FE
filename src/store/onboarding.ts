import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface OnboardingState {
  completed: boolean;
  hydrated: boolean;
  setCompleted: (completed: boolean) => void;
  _setHydrated: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      hydrated: false,
      setCompleted: (completed) => set({ completed }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'aidrobe.onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ completed: s.completed }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
