import { Platform } from 'react-native';
import { API_BASE_URL, APP_ENV } from '@/api/client';
import { currentV3FlowId } from '@/api/v3Flow';
import { enableV3Analytics } from '@/lib/featureFlags';
import { useAuthStore } from '@/store/auth';
import { useDevUserStore } from '@/store/devUser';
import { setAnalyticsDispatcher } from '@/utils/analytics';
import { analyticsSession } from '@/utils/v3AnalyticsIdentity';
import { createV3AnalyticsDispatcher } from '@/utils/v3AnalyticsTransport';
import type { V3EventContext } from '@/utils/v3AnalyticsEvents';

const session = () => analyticsSession(
  useAuthStore.getState().accessToken, useDevUserStore.getState().userId, APP_ENV === 'production',
);
const mobile = () => Platform.OS === 'ios' || Platform.OS === 'android';
const transport = createV3AnalyticsDispatcher({
  session,
  enabled: enableV3Analytics && mobile(),
  send: async (events, owner, signal) => {
    // Deliberately NOT apiClient: analytics must not refresh tokens, sign users
    // out, show an error toast, or replay a prior account with new credentials.
    const abort = new AbortController();
    const cancel = () => abort.abort();
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    const timeout = setTimeout(cancel, 2500);
    try {
      const response = await fetch(API_BASE_URL.replace(/\/$/, '') + '/v1/analytics/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...owner.headers },
        body: JSON.stringify({ events }), signal: abort.signal,
        // No collector credentials or third-party URL ever reach the client.
        credentials: 'omit', redirect: 'error',
      });
      return { status: response.status, disabled: response.headers.get('X-Aidrobe-Telemetry-Disabled') === '1' };
    } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancel); }
  },
});
let installed = false;
/** Called before app rendering, so child mount effects cannot beat registration. */
export function installV3Analytics(): void {
  if (installed) return;
  installed = true;
  setAnalyticsDispatcher(transport.dispatch);
  useAuthStore.subscribe(transport.sessionChanged);
  useDevUserStore.subscribe(transport.sessionChanged);
}
/** Independent runtime kill: abort in flight and discard buffered records. */
export function setV3AnalyticsEnabled(enabled: boolean): void { transport.setEnabled(enabled && mobile()); }
export function currentV3EventContext(expectedSessionKey?: string | null): V3EventContext | null {
  const owner = session();
  if (!owner || !mobile() || (expectedSessionKey !== undefined && owner.key !== expectedSessionKey)) return null;
  return { userId: owner.userId, platform: Platform.OS === 'android' ? 'android' : 'ios',
    flowId: currentV3FlowId() ?? undefined };
}
