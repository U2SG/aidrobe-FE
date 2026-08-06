/**
 * V3 analytics event contract — FE mirror (V3-002).
 *
 * The source of truth is `docs/v3-analytics-events.json`, byte-identical with
 * aidrobe-BE's copy; `docs/v3-analytics-events.md` carries the semantics,
 * privacy rules and kill-criteria metrics. `scripts/v3AnalyticsEvents.test.ts`
 * asserts this file against that JSON, so a field added on one side only fails
 * the build.
 *
 * Deliberately import-free at runtime (the only import is type-only, and
 * therefore erased) so the Node regression runner can load it directly.
 * The emitter is `trackV3` in `@/utils/analytics` — it funnels into the same
 * dispatcher as every other event.
 *
 * Privacy invariant: every field below is a closed value space (enum, boolean,
 * bounded integer). There is no free-text field, so a photo URL, prompt or body
 * inference cannot travel in a valid event.
 */

import type { AnalyticsEvent } from '@/utils/analytics';

/** Flow correlation rides the existing correlation header, so analytics never
 *  changes an API shape (v3-p0-contract §8). BE reads it via its
 *  CorrelationIdMiddleware. */
export const V3_FLOW_ID_HEADER = 'X-Correlation-Id';

/** The 11 V3 event names, derived from the registry in `@/utils/analytics` —
 *  a name missing there is a compile error in `V3_EVENT_SPECS` below. */
export type V3EventName = Extract<AnalyticsEvent, `v3_${string}`>;

export const V3_DECISION_SOURCES = ['share_link', 'screenshot', 'order_image', 'ask_link'] as const;
export const V3_DECISIONS = [
  'worth_adding',
  'consider_alternate',
  'wait',
  'avoid_duplicate',
  'insufficient_information',
] as const;
export const V3_UNCERTAINTIES = ['low', 'medium', 'high'] as const;
export const V3_VISUAL_NEEDS = ['none', 'helpful', 'recommended'] as const;
export const V3_PARSE_STATUSES = ['parsed', 'parse_failed'] as const;
export const V3_DECISION_ACTIONS = [
  'add_to_candidates',
  'skip',
  'recheck_color',
  'style_with_existing',
] as const;
export const V3_AVATAR_SOURCES = ['ootd_photo', 'outfit_import', 'user_upload', 'camera_capture'] as const;
export const V3_AVATAR_PROMPT_CONTEXTS = ['post_flow_sheet', 'preview_request'] as const;
export const V3_AVATAR_STATUSES = [
  'none',
  'candidate',
  'preparing',
  'ready',
  'refresh_recommended',
  'disabled',
] as const;
/** §6.1 preview concern — NOT the §5.3 decision concern; the two are frozen separately. */
export const V3_PREVIEW_CONCERNS = ['volume', 'color', 'length', 'overall'] as const;
export const V3_PREVIEW_TERMINAL_STATUSES = ['ready', 'failed', 'rejected_by_quality_gate'] as const;
export const V3_PREVIEW_VIEW_RESULTS = ['shown', 'fallback'] as const;
export const V3_FEEDBACK_VERDICTS = ['looks_like_me', 'not_like_me', 'garment_wrong'] as const;
export const V3_FEEDBACK_ASPECTS = ['face', 'body_ratio', 'garment_fit', 'color', 'other'] as const;

export type V3DecisionSource = (typeof V3_DECISION_SOURCES)[number];
export type V3Decision = (typeof V3_DECISIONS)[number];
export type V3Uncertainty = (typeof V3_UNCERTAINTIES)[number];
export type V3VisualNeed = (typeof V3_VISUAL_NEEDS)[number];
export type V3ParseStatus = (typeof V3_PARSE_STATUSES)[number];
export type V3DecisionAction = (typeof V3_DECISION_ACTIONS)[number];
export type V3AvatarSource = (typeof V3_AVATAR_SOURCES)[number];
export type V3AvatarPromptContext = (typeof V3_AVATAR_PROMPT_CONTEXTS)[number];
export type V3AvatarStatus = (typeof V3_AVATAR_STATUSES)[number];
export type V3PreviewConcern = (typeof V3_PREVIEW_CONCERNS)[number];
export type V3PreviewTerminalStatus = (typeof V3_PREVIEW_TERMINAL_STATUSES)[number];
export type V3PreviewViewResult = (typeof V3_PREVIEW_VIEW_RESULTS)[number];
export type V3FeedbackVerdict = (typeof V3_FEEDBACK_VERDICTS)[number];
export type V3FeedbackAspect = (typeof V3_FEEDBACK_ASPECTS)[number];

/** Typed payload per event — this is what "same field semantics" means on the
 *  FE side; the runtime specs below are what the drift test compares. */
export type V3EventPayloads = {
  v3_decision_started: { source_type: V3DecisionSource };
  v3_decision_completed: {
    decision: V3Decision;
    uncertainty: V3Uncertainty;
    visual_need: V3VisualNeed;
    parse_status: V3ParseStatus;
  };
  v3_decision_viewed: { decision: V3Decision };
  v3_decision_action: { action: V3DecisionAction };
  v3_avatar_prompt_shown: { source_type: V3AvatarSource; context: V3AvatarPromptContext };
  v3_avatar_consent: { accepted: boolean; source_type: V3AvatarSource };
  v3_avatar_deleted: { purge_derived: boolean };
  v3_preview_requested: { concern: V3PreviewConcern; avatar_status: V3AvatarStatus };
  v3_preview_outcome: {
    generation_status: V3PreviewTerminalStatus;
    cache_hit: boolean;
    retry_count: number;
  };
  v3_preview_viewed: { result: V3PreviewViewResult };
  v3_preview_feedback: { verdict: V3FeedbackVerdict; aspects?: V3FeedbackAspect[] };
};

/** Events this client is allowed to emit. The rest are BE-owned — a duplicate
 *  emit from here would double-count every rate on the dashboard. */
export const V3_FE_OWNED_EVENTS = [
  'v3_decision_started',
  'v3_decision_viewed',
  'v3_decision_action',
  'v3_avatar_prompt_shown',
  'v3_preview_requested',
  'v3_preview_viewed',
  'v3_preview_feedback',
] as const;
export type V3FeOwnedEvent = (typeof V3_FE_OWNED_EVENTS)[number];

export type V3FieldType = 'boolean' | 'enum' | 'enum_array' | 'integer' | 'timestamp' | 'uuid';
export type V3FlowIdRule = 'required' | 'when_in_flow' | 'not_applicable';

export type V3FieldSpec = {
  type: V3FieldType;
  required: boolean;
  values?: readonly string[];
  min?: number;
  max?: number;
};

export type V3EventSpec = {
  owner: 'fe' | 'be';
  group: 'decision' | 'avatar' | 'preview';
  flow_id: V3FlowIdRule;
  fields: Record<string, V3FieldSpec>;
};

const required = (type: V3FieldType, values?: readonly string[]): V3FieldSpec => ({
  type,
  required: true,
  ...(values ? { values } : {}),
});

export const V3_EVENT_SPECS: Record<V3EventName, V3EventSpec> = {
  v3_decision_started: {
    owner: 'fe',
    group: 'decision',
    flow_id: 'required',
    fields: { source_type: required('enum', V3_DECISION_SOURCES) },
  },
  v3_decision_completed: {
    owner: 'be',
    group: 'decision',
    flow_id: 'required',
    fields: {
      decision: required('enum', V3_DECISIONS),
      uncertainty: required('enum', V3_UNCERTAINTIES),
      visual_need: required('enum', V3_VISUAL_NEEDS),
      parse_status: required('enum', V3_PARSE_STATUSES),
    },
  },
  v3_decision_viewed: {
    owner: 'fe',
    group: 'decision',
    flow_id: 'required',
    fields: { decision: required('enum', V3_DECISIONS) },
  },
  v3_decision_action: {
    owner: 'fe',
    group: 'decision',
    flow_id: 'required',
    fields: { action: required('enum', V3_DECISION_ACTIONS) },
  },
  v3_avatar_prompt_shown: {
    owner: 'fe',
    group: 'avatar',
    flow_id: 'when_in_flow',
    fields: {
      source_type: required('enum', V3_AVATAR_SOURCES),
      context: required('enum', V3_AVATAR_PROMPT_CONTEXTS),
    },
  },
  v3_avatar_consent: {
    owner: 'be',
    group: 'avatar',
    flow_id: 'when_in_flow',
    fields: {
      accepted: required('boolean'),
      source_type: required('enum', V3_AVATAR_SOURCES),
    },
  },
  v3_avatar_deleted: {
    owner: 'be',
    group: 'avatar',
    flow_id: 'not_applicable',
    fields: { purge_derived: required('boolean') },
  },
  v3_preview_requested: {
    owner: 'fe',
    group: 'preview',
    flow_id: 'required',
    fields: {
      concern: required('enum', V3_PREVIEW_CONCERNS),
      avatar_status: required('enum', V3_AVATAR_STATUSES),
    },
  },
  v3_preview_outcome: {
    owner: 'be',
    group: 'preview',
    flow_id: 'required',
    fields: {
      generation_status: required('enum', V3_PREVIEW_TERMINAL_STATUSES),
      cache_hit: required('boolean'),
      retry_count: { type: 'integer', required: true, min: 0, max: 1 },
    },
  },
  v3_preview_viewed: {
    owner: 'fe',
    group: 'preview',
    flow_id: 'required',
    fields: { result: required('enum', V3_PREVIEW_VIEW_RESULTS) },
  },
  v3_preview_feedback: {
    owner: 'fe',
    group: 'preview',
    flow_id: 'required',
    fields: {
      verdict: required('enum', V3_FEEDBACK_VERDICTS),
      aspects: { type: 'enum_array', required: false, values: V3_FEEDBACK_ASPECTS },
    },
  },
};

/** Field names that must never appear in an event (see the privacy review in
 *  docs/v3-analytics-events.md §5). Enforced at emit time so a future caller
 *  cannot smuggle one in through a widened props type. */
export const V3_FORBIDDEN_FIELD_NAMES: readonly string[] = [
  'age_estimate',
  'attractiveness_score',
  'body_measurements',
  'body_shape_estimate',
  'canonical_front_url',
  'comment',
  'device_id',
  'email',
  'free_text',
  'height',
  'image_base64',
  'image_bytes',
  'image_url',
  'ip_address',
  'metadata',
  'model_version',
  'note',
  'phone',
  'photo_url',
  'preview_url',
  'prompt',
  'prompt_text',
  'prompt_version',
  'provider',
  'quality_signals',
  'signed_url',
  'source_url',
  'url',
  'weight',
];

export const V3_ANALYTICS_SCHEMA_VERSION = 1;

/** Envelope the emitter adds to every event. `platform`/`userId` come from the
 *  caller so this module stays React-Native-free. */
export type V3EventContext = {
  platform: 'ios' | 'android';
  userId: string;
  flowId?: string;
};

export type V3Envelope = {
  schema_version: number;
  occurred_at: string;
  platform: 'ios' | 'android';
  user_id: string;
  flow_id?: string;
};

/**
 * One flow = one "should I buy this" attempt. Generate at flow start, keep
 * until the flow ends, and send as the `V3_FLOW_ID_HEADER` on every request in
 * it. Math.random is deliberate: this is a correlation id, not a secret, and it
 * avoids a crypto dependency (same trade-off as `utils/deviceId`).
 */
export function newFlowId(): string {
  const hex = (count: number): string => {
    let out = '';
    for (let i = 0; i < count; i += 1) out += Math.floor(Math.random() * 16).toString(16);
    return out;
  };
  const variant = ((Math.floor(Math.random() * 4) + 8) as 8 | 9 | 10 | 11).toString(16);
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${variant}${hex(3)}-${hex(12)}`;
}

/**
 * Validate one event against the contract. Returns an error message, or null
 * when the payload is valid. Mirrors `validate_v3_event` in aidrobe-BE.
 */
export function validateV3Event(
  event: V3EventName,
  payload: Record<string, unknown>,
  flowId?: string,
): string | null {
  const spec = V3_EVENT_SPECS[event];
  if (!spec) return `unknown V3 analytics event: ${event}`;
  if (spec.flow_id === 'required' && !flowId) return `${event}: flow_id is required`;
  if (spec.flow_id === 'not_applicable' && flowId) return `${event}: flow_id does not apply to this event`;

  for (const name of Object.keys(payload)) {
    if (V3_FORBIDDEN_FIELD_NAMES.includes(name)) {
      return `${event}: field '${name}' is forbidden by the privacy contract`;
    }
    if (!(name in spec.fields)) return `${event}: unknown field '${name}'`;
  }
  for (const [name, field] of Object.entries(spec.fields)) {
    const value = payload[name];
    if (value === undefined) {
      if (field.required) return `${event}: missing required field '${name}'`;
      continue;
    }
    const problem = validateValue(field, value);
    if (problem) return `${event}.${name}: ${problem}`;
  }
  return null;
}

function validateValue(field: V3FieldSpec, value: unknown): string | null {
  switch (field.type) {
    case 'boolean':
      return typeof value === 'boolean' ? null : 'expected boolean';
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) return 'expected integer';
      if (field.min !== undefined && value < field.min) return `below minimum ${field.min}`;
      if (field.max !== undefined && value > field.max) return `above maximum ${field.max}`;
      return null;
    case 'enum':
      return typeof value === 'string' && field.values?.includes(value)
        ? null
        : `expected one of ${field.values?.join('|')}`;
    case 'enum_array':
      if (!Array.isArray(value)) return 'expected a list';
      return value.every((item) => typeof item === 'string' && field.values?.includes(item))
        ? null
        : `expected items from ${field.values?.join('|')}`;
    default:
      return typeof value === 'string' && value.length > 0 ? null : 'expected a non-empty string';
  }
}

/** Build the wire props for one event: envelope + payload, nothing else. */
export function buildV3EventProps(
  payload: Record<string, unknown>,
  context: V3EventContext,
  now: string,
): V3Envelope & Record<string, unknown> {
  return {
    schema_version: V3_ANALYTICS_SCHEMA_VERSION,
    occurred_at: now,
    platform: context.platform,
    user_id: context.userId,
    ...(context.flowId ? { flow_id: context.flowId } : {}),
    ...payload,
  };
}
