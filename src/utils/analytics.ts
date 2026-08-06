/**
 * 埋点事件名常量（与 docs §9 对齐）
 *
 * V1 Slim 仅打印到控制台 + 预留 Provider 接口；
 * 接入 PostHog / 自研事件接口时，只需替换 dispatch 实现。
 */

import { buildV3EventProps, validateV3Event } from '@/utils/v3AnalyticsEvents';
import type {
  V3EventContext,
  V3EventPayloads,
  V3FeOwnedEvent,
} from '@/utils/v3AnalyticsEvents';

export const ANALYTICS_EVENTS = {
  landing_viewed: 'landing_viewed',
  onboarding_started: 'onboarding_started',
  departure_time_saved: 'departure_time_saved',
  add_item_started: 'add_item_started',
  image_selected: 'image_selected',
  import_task_created: 'import_task_created',
  import_confirm_viewed: 'import_confirm_viewed',
  apple_login_completed: 'apple_login_completed',
  invite_login_completed: 'invite_login_completed',
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
  // Best-effort OOTD selfie attach onto today's wear-history record.
  ootd_attached_to_history: 'ootd_attached_to_history',
  ootd_attach_skipped: 'ootd_attach_skipped',
  outfit_item_replaced: 'outfit_item_replaced',
  outfit_obstacle_ignored: 'outfit_obstacle_ignored',
  // Today v2: user submitted a context override (chip or free text).
  context_override_submitted: 'context_override_submitted',
  // First Outfit activation reached the ready/single state.
  first_outfit_generated: 'first_outfit_generated',
  // Indoor climate P1.5: a too_cold/too_warm feedback contradicted the outdoor
  // temperature (medium indoor-climate signal). Never labels the user.
  temperature_mismatch_reported: 'temperature_mismatch_reported',
  // Optional departure micro-question: how much outdoor exposure the commute has.
  commute_exposure_selected: 'commute_exposure_selected',

  // --- V3 (V3-002) ------------------------------------------------------
  // Frozen cross-repo contract: docs/v3-analytics-events.{json,md}, mirrored
  // byte-identically in aidrobe-BE. Emit only via `trackV3` below — the plain
  // `track` path has no field semantics and no privacy check. Names listed
  // literally here (not spread in) so this registry stays the one place to
  // read every event the app can emit; `V3_EVENT_SPECS` fails to compile if a
  // name is missing.
  v3_decision_started: 'v3_decision_started',
  v3_decision_completed: 'v3_decision_completed',
  v3_decision_viewed: 'v3_decision_viewed',
  v3_decision_action: 'v3_decision_action',
  v3_avatar_prompt_shown: 'v3_avatar_prompt_shown',
  v3_avatar_consent: 'v3_avatar_consent',
  v3_avatar_deleted: 'v3_avatar_deleted',
  v3_preview_requested: 'v3_preview_requested',
  v3_preview_outcome: 'v3_preview_outcome',
  v3_preview_viewed: 'v3_preview_viewed',
  v3_preview_feedback: 'v3_preview_feedback',
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

/**
 * Emit one V3 event (V3-002). Same dispatcher as `track`, but the payload is
 * typed per event and validated against the frozen contract first, so a field
 * that is not in the contract — or a forbidden one like a photo URL — cannot
 * reach the sink.
 *
 * Only FE-owned events are accepted; `v3_decision_completed`,
 * `v3_avatar_consent` and `v3_avatar_deleted` are emitted by the backend and a
 * second emit here would double-count every rate on the dashboard.
 *
 * A contract violation throws in development (silent analytics bugs are found
 * months later, on the dashboard) and is dropped with a warning in production
 * (analytics must never crash a user flow).
 */
export function trackV3<E extends V3FeOwnedEvent>(
  event: E,
  payload: V3EventPayloads[E],
  context: V3EventContext,
): void {
  const props = payload as Record<string, unknown>;
  const problem = validateV3Event(event, props, context.flowId);
  if (problem) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) throw new Error(`[trackV3] ${problem}`);
    // eslint-disable-next-line no-console
    console.warn('[trackV3] dropped invalid event', problem);
    return;
  }
  dispatcher(event, buildV3EventProps(props, context, new Date().toISOString()));
}
