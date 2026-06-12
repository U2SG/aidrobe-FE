import { apiPost } from './client';
import type { AuthTokenResponse } from '@/types/api';

export function loginWithApple(idToken: string) {
  return apiPost<AuthTokenResponse>('/v1/auth/login/apple', { id_token: idToken });
}

export function refreshToken(refreshTokenValue: string) {
  return apiPost<AuthTokenResponse>('/v1/auth/refresh', {
    refresh_token: refreshTokenValue,
  });
}
