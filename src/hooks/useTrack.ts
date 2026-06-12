import { useCallback } from 'react';

import { track, type AnalyticsEvent } from '@/utils/analytics';

/** 当前页面对应的埋点事件名称（统一管理在 utils/analytics.ts） */
export function useTrack() {
  return useCallback(<E extends AnalyticsEvent>(event: E, props?: Record<string, unknown>) => {
    track(event, props);
  }, []);
}
