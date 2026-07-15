import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// The one sanctioned active question for indoor-climate awareness (brief §9.5):
// how much the commute is exposed to the outdoors. A weak/medium prior for
// indoor-climate inference — never surfaced back as a "室内通勤用户" label (§9.6).
// Stored locally until a BE settings field exists (API_GAP).
export type CommuteExposure = 'more_outdoor' | 'less_outdoor';

interface CommuteExposureStore {
  exposure: CommuteExposure | null;
  hydrated: boolean;
  setExposure: (exposure: CommuteExposure) => void;
  _setHydrated: () => void;
}

export const useCommuteExposureStore = create<CommuteExposureStore>()(
  persist(
    (set) => ({
      exposure: null,
      hydrated: false,
      setExposure: (exposure) => set({ exposure }),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'aidrobe.commuteExposure',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ exposure: s.exposure }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);
