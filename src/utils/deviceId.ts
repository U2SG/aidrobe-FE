import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'aidrobe.deviceId';

let cached: string | null = null;

// 32 hex chars from Math.random — enough entropy for an install identity
// (the backend hashes it again); avoids pulling in a uuid/crypto dependency.
function generateId(): string {
  let id = '';
  while (id.length < 32) {
    id += Math.floor(Math.random() * 16).toString(16);
  }
  return id;
}

/**
 * Stable per-install id. Invite-code login derives the ACCOUNT from this —
 * the code only grants admission — so it must persist across app restarts
 * (SecureStore) and be generated exactly once per install.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY).catch(() => null);
  if (existing) {
    cached = existing;
    return existing;
  }
  const id = generateId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id).catch(() => undefined);
  cached = id;
  return id;
}
