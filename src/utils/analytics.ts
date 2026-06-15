/**
 * 埋点事件名常量（与 docs §9 对齐）
 *
 * V1 Slim 仅打印到控制台 + 预留 Provider 接口；
 * 接入 PostHog / 自研事件接口时，只需替换 dispatch 实现。
 */

export const ANALYTICS_EVENTS = {
  landing_viewed: 'landing_viewed',
  onboarding_started: 'onboarding_started',
  departure_time_saved: 'departure_time_saved',
  add_item_started: 'add_item_started',
  image_selected: 'image_selected',
  import_task_created: 'import_task_created',
  import_confirm_viewed: 'import_confirm_viewed',
  apple_login_completed: 'apple_login_completed',
  item_saved: 'item_saved',
  today_viewed: 'today_viewed',
  outfit_detail_viewed: 'outfit_detail_viewed',
  outfit_worn: 'outfit_worn',
  outfit_feedback_sent: 'outfit_feedback_sent',
  ootd_poster_started: 'ootd_poster_started',
  ootd_poster_generated: 'ootd_poster_generated',
} as const;

export type AnalyticsEvent = keyof typeof ANALYTICS_EVENTS;

type Dispatcher = (event: AnalyticsEvent, props?: Record<string, unknown>) => void;

let dispatcher: Dispatcher = (event, props) => {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[track]', event, props ?? {});
  }
};

export function setAnalyticsDispatcher(next: Dispatcher) {
  dispatcher = next;
}

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  dispatcher(event, props);
}
