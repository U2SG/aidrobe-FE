import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { LocalePreference } from '@/utils/locale';

interface LocalePrefState {
  // User's chosen language. 'system' (the default) follows the device locale.
  // This local store — not the server round-trip — is the render source of
  // truth, so switching language is instant; the settings PATCH is a
  // write-through sync (see SettingsScreen). No hydration guard is needed:
  // useT resolves 'system' (the default) gracefully until rehydration lands.
  preference: LocalePreference;
  setPreference: (preference: LocalePreference) => void;
}

export const useLocalePrefStore = create<LocalePrefState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    {
      name: 'aidrobe.localePref',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ preference: s.preference }),
    },
  ),
);
