import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthTokenResponse } from '@/types/api';

const ACCESS_KEY = 'aidrobe.accessToken';
const REFRESH_KEY = 'aidrobe.refreshToken';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTokens: (tokens: AuthTokenResponse) => Promise<void>;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY).catch(() => null),
      SecureStore.getItemAsync(REFRESH_KEY).catch(() => null),
    ]);
    set({ accessToken, refreshToken, hydrated: true });
  },
  setTokens: async (tokens) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token),
      SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token),
    ]);
    set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  },
  clear: async () => {
    // Clear synchronously so analytics aborts before SecureStore I/O completes.
    set({ accessToken: null, refreshToken: null });
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined),
    ]);
  },
}));
