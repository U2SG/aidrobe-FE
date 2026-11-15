import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthTokenResponse } from '@/types/api';

const ACCESS_KEY = 'aidrobe.accessToken';
const REFRESH_KEY = 'aidrobe.refreshToken';

// Serialize persistence so a refresh already writing cannot outlive a later logout/login on disk.
let tokenWrites = Promise.resolve();
function persistTokens(tokens: AuthTokenResponse | null): Promise<void> {
  const write = tokenWrites.then(async () => {
    if (tokens) {
      await SecureStore.setItemAsync(ACCESS_KEY, tokens.access_token);
      await SecureStore.setItemAsync(REFRESH_KEY, tokens.refresh_token);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => undefined),
        SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined),
      ]);
    }
  });
  tokenWrites = write.catch(() => undefined);
  return write;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  sessionVersion: number;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setTokens: (tokens: AuthTokenResponse) => Promise<void>;
  refreshTokens: (tokens: AuthTokenResponse, expectedSessionVersion: number) => Promise<boolean>;
  clear: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  sessionVersion: 0,
  hydrated: false,
  hydrate: async () => {
    const sessionVersion = get().sessionVersion;
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY).catch(() => null),
      SecureStore.getItemAsync(REFRESH_KEY).catch(() => null),
    ]);
    if (get().sessionVersion === sessionVersion) {
      set({ accessToken, refreshToken, hydrated: true, sessionVersion: sessionVersion + 1 });
    } else {
      set({ hydrated: true });
    }
  },
  setTokens: async (tokens) => {
    const sessionVersion = get().sessionVersion + 1;
    set({ accessToken: null, refreshToken: null, sessionVersion });
    try {
      await persistTokens(tokens);
    } catch (error) {
      if (get().sessionVersion === sessionVersion) await get().clear();
      throw error;
    }
    if (get().sessionVersion !== sessionVersion) throw new Error('Authentication session changed');
    set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  },
  refreshTokens: async (tokens, expectedSessionVersion) => {
    if (get().sessionVersion !== expectedSessionVersion) return false;
    await persistTokens(tokens);
    if (get().sessionVersion !== expectedSessionVersion) return false;
    set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
    return true;
  },
  clear: async () => {
    // Clear synchronously so analytics aborts before SecureStore I/O completes.
    set({ accessToken: null, refreshToken: null, sessionVersion: get().sessionVersion + 1 });
    await persistTokens(null);
  },
}));
