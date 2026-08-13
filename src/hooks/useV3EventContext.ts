import { useCallback } from 'react';
import { Platform } from 'react-native';

import { currentV3FlowId } from '@/api/v3Flow';
import { useDevUserStore } from '@/store/devUser';
import type { V3EventContext } from '@/utils/v3AnalyticsEvents';

// V3-009 — the envelope context every `trackV3` call needs. Returns a GETTER
// rather than a value because `flow_id` must be read at emit time: the active
// flow opens and closes during a screen's lifetime (see `beginV3Flow`), so a
// value captured at render would stamp a stale — or missing — correlation id.
//
// Returns `null` when there is no user identity yet, and callers skip the emit.
// An envelope with an invented `user_id` is worse than a missing event: it
// silently pollutes every per-user rate on the V3-002 dashboard. In practice
// `RootNavigator` blocks rendering until the dev-user store has hydrated, so no
// screen mounts before an id exists.
//
// One honest limitation, carried to the V3-023 sink work: the frozen envelope
// enum is mobile-only ('ios' | 'android'), so the web dev preview reports
// 'ios'. No production web build exists, and the only sink today is the dev
// console dispatcher.
export function useV3EventContext(): () => V3EventContext | null {
  const userId = useDevUserStore((s) => s.userId);
  return useCallback(() => {
    if (!userId) return null;
    return {
      platform: Platform.OS === 'android' ? 'android' : 'ios',
      userId,
      flowId: currentV3FlowId() ?? undefined,
    };
  }, [userId]);
}
