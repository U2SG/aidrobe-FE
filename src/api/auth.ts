import { apiPost } from './client';
import type { AuthTokenResponse } from '@/types/api';
import { getOrCreateDeviceId } from '@/utils/deviceId';

// Auth requests silence the global error toast — callers own their own error UI
// (WelcomeScreen shows an inline error or a manual toast on failure).
export function loginWithApple(idToken: string) {
  return apiPost<AuthTokenResponse>(
    '/v1/auth/login/apple',
    { id_token: idToken },
    undefined,
    { silentErrorToast: true },
  );
}

export async function inviteLogin(inviteCode: string) {
  // The code grants admission only; the account derives from the persistent
  // per-install device id, so one shared code ≠ one shared wardrobe.
  const deviceId = await getOrCreateDeviceId();
  return apiPost<AuthTokenResponse>(
    '/v1/auth/login/invite',
    { invite_code: inviteCode, device_id: deviceId },
    undefined,
    { silentErrorToast: true },
  );
}

export function refreshToken(refreshTokenValue: string) {
  return apiPost<AuthTokenResponse>(
    '/v1/auth/refresh',
    { refresh_token: refreshTokenValue },
    undefined,
    { silentErrorToast: true },
  );
}
