import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type LocationMode = 'gps' | 'manual';

interface LocationPrefState {
  // null = user hasn't chosen yet (Settings infers from the saved location).
  mode: LocationMode | null;
  // Friendly city name for GPS mode display — we never show raw lng,lat.
  label: string | null;
  hydrated: boolean;
  setMode: (mode: LocationMode) => void;
  setLabel: (label: string | null) => void;
  _setHydrated: () => void;
}

export const useLocationPrefStore = create<LocationPrefState>()(
  persist(
    (set) => ({
      mode: null,
      label: null,
      hydrated: false,
      setMode: (mode) => set({ mode }),
      setLabel: (label) => set({ label }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'aidrobe.locationPref',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ mode: s.mode, label: s.label }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
