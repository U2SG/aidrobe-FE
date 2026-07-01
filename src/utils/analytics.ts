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
  outfit_shared: 'outfit_shared',
  outfit_feedback_sent: 'outfit_feedback_sent',
  calendar_viewed: 'calendar_viewed',
  outfit_plan_created: 'outfit_plan_created',
  outfit_plan_worn_marked: 'outfit_plan_worn_marked',
  discover_viewed: 'discover_viewed',
  insights_viewed: 'insights_viewed',
  wardrobe_report_viewed: 'wardrobe_report_viewed',
  packing_list_viewed: 'packing_list_viewed',
  packing_list_created: 'packing_list_created',
  sense_check_viewed: 'sense_check_viewed',
  sense_check_run: 'sense_check_run',
  inspiration_viewed: 'inspiration_viewed',
  inspiration_added: 'inspiration_added',
  ask_viewed: 'ask_viewed',
  ask_sent: 'ask_sent',
  ootd_poster_started: 'ootd_poster_started',
  ootd_poster_generated: 'ootd_poster_generated',
  ootd_poster_shared: 'ootd_poster_shared',
  outfit_item_replaced: 'outfit_item_replaced',
  outfit_obstacle_ignored: 'outfit_obstacle_ignored',
  // Today v2: user submitted a context override (chip or free text).
  context_override_submitted: 'context_override_submitted',
  // First Outfit activation reached the ready/single state.
  first_outfit_generated: 'first_outfit_generated',
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
