import { useCallback } from 'react';
import { APP_ENV } from '@/api/client';
import { useAuthStore } from '@/store/auth';
import { useDevUserStore } from '@/store/devUser';
import { analyticsSession } from '@/utils/v3AnalyticsIdentity';
import { currentV3EventContext } from '@/utils/v3AnalyticsRuntime';
import type { V3EventContext } from '@/utils/v3AnalyticsEvents';

// Keep an async callback bound to the session that created it. Read live flow
// at emit time, but reject old-session callbacks after logout/account rotation.
export function useV3EventContext(): () => V3EventContext | null {
  const accessToken = useAuthStore((state) => state.accessToken);
  const devUserId = useDevUserStore((state) => state.userId);
  const key = analyticsSession(accessToken, devUserId, APP_ENV === 'production')?.key ?? null;
  return useCallback(() => currentV3EventContext(key), [key]);
}
