/**
 * V3-008 — purchase-decision wire mapping (contract §5.2–§5.3, frozen).
 *
 * The client-side half of the frozen decision contract: snake_case wire types,
 * camelCase client types, and the version-skew rules the contract mandates.
 * NO decision logic lives here — `decision_text`, `reasons[].text`,
 * `summary_text` and `boundary_note` are server-rendered display copy that the
 * client never synthesizes or re-derives (contract §5.3).
 *
 * Deliberately import-free at runtime so the Node regression runner loads it
 * directly (the `v3AnalyticsEvents.ts` / `errorToast.ts` pattern; tested by
 * `scripts/purchaseDecisionMapping.test.ts`, and pinned against the OpenAPI
 * artifact by `scripts/purchaseDecisionContract.test.ts`).
 *
 * Version-skew rules implemented here (contract §3, frozen):
 * - unknown `decision` ⇒ `knownDecision: null` — render the server texts with
 *   no decision-specific styling or actions;
 * - unknown `next_actions` entries are dropped — an action button must lead
 *   somewhere real;
 * - unknown `visual_need` ⇒ `'none'` — a missing optional V3 block means
 *   "feature not available", never an error, so no preview entry is shown;
 * - unknown candidate `status` is TERMINAL — only `submitted` is worth another
 *   poll, so a newer BE can never make an older client spin forever;
 * - a missing/null optional block (`parsed_item`, `closet_comparison`,
 *   `reasons`, `next_actions`) degrades to an empty value, never a throw.
 */

// --- Frozen vocabularies (contract §5.2–§5.3; byte-checked against ---------
// --- docs/openapi.json by scripts/purchaseDecisionContract.test.ts) --------

export const PURCHASE_DECISIONS = [
  'worth_adding',
  'consider_alternate',
  'wait',
  'avoid_duplicate',
  'insufficient_information',
] as const;
export type PurchaseDecisionValue = (typeof PURCHASE_DECISIONS)[number];

export const DECISION_REASON_KINDS = [
  'redundancy',
  'compatibility',
  'scene_coverage',
  'extra_purchase_needed',
  // Frozen in the vocabulary but not emitted in P0 (contract §5.3): tolerate
  // it, never build a surface that depends on it.
  'adoption_history',
] as const;
export type DecisionReasonKind = (typeof DECISION_REASON_KINDS)[number];

export const DECISION_UNCERTAINTIES = ['low', 'medium', 'high'] as const;
export type DecisionUncertainty = (typeof DECISION_UNCERTAINTIES)[number];

export const DECISION_VISUAL_NEEDS = ['none', 'helpful', 'recommended'] as const;
export type DecisionVisualNeed = (typeof DECISION_VISUAL_NEEDS)[number];

export const DECISION_NEXT_ACTIONS = [
  'add_to_candidates',
  'skip',
  'recheck_color',
  'style_with_existing',
] as const;
export type DecisionNextAction = (typeof DECISION_NEXT_ACTIONS)[number];

export const DECISION_CONCERNS = ['volume', 'color', 'redundancy', 'scene', 'none'] as const;
export type DecisionConcern = (typeof DECISION_CONCERNS)[number];

export const COMPARISON_RELATIONS = ['covers', 'complements'] as const;
export type ComparisonRelation = (typeof COMPARISON_RELATIONS)[number];

export const CANDIDATE_SOURCE_TYPES = [
  'share_link',
  'screenshot',
  'order_image',
  'ask_link',
] as const;
export type CandidateSourceType = (typeof CANDIDATE_SOURCE_TYPES)[number];

export const CANDIDATE_STATUSES = ['submitted', 'parsed', 'parse_failed'] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

// --- Wire types (snake_case, exactly the §5.2/§5.3 shapes) -----------------
// Open-vocabulary fields are typed `string` on the wire so a newer BE cannot
// make parsing throw; the mapping functions narrow them.

export interface ServerParsedCandidateItem {
  category?: string | null;
  colors?: string[] | null;
  silhouette?: string | null;
  material_hints?: string[] | null;
  price?: string | null;
  scene_tags?: string[] | null;
}

export interface ServerPurchaseCandidate {
  id: string;
  status: string;
  parsed_item?: ServerParsedCandidateItem | null;
}

export interface ServerDecisionReason {
  kind: string;
  text: string;
}

export interface ServerComparisonItem {
  item_id: string;
  image_url?: string | null;
  relation: string;
}

export interface ServerClosetComparison {
  summary_text?: string | null;
  similar_items?: ServerComparisonItem[] | null;
}

export interface ServerWardrobeDecision {
  id: string;
  candidate_id?: string | null;
  decision: string;
  decision_text: string;
  reasons?: ServerDecisionReason[] | null;
  closet_comparison?: ServerClosetComparison | null;
  uncertainty: string;
  visual_need?: string | null;
  boundary_note?: string | null;
  next_actions?: string[] | null;
  created_at: string;
}

// --- Client types (camelCase) -----------------------------------------------

export interface ParsedCandidateItem {
  category: string | null;
  colors: string[];
  silhouette: string | null;
  materialHints: string[];
  price: string | null;
  sceneTags: string[];
}

export interface PurchaseCandidate {
  id: string;
  /** Raw server value, kept for display/debugging even when unknown. */
  status: string;
  /** False only for `submitted`; an UNKNOWN status is terminal so a newer BE
   * can never make this client poll forever (contract §5.2 skew rule). */
  isTerminal: boolean;
  /** Null for `parse_failed` — the candidate is still decidable; the UI offers
   * editable/partial input instead of a dead end (contract §5.2). */
  parsedItem: ParsedCandidateItem | null;
}

export interface DecisionReason {
  /** Raw kind; unknown kinds keep their text (it is server display copy) but
   * `isKnownKind` is false so the UI adds no kind-specific icon/behavior. */
  kind: string;
  isKnownKind: boolean;
  text: string;
}

export interface ComparisonItem {
  itemId: string;
  /** Short-lived signed URL or null (no image / storage outage). Display
   * detail, never an error — and never persisted (contract §3). */
  imageUrl: string | null;
  relation: ComparisonRelation | null;
}

export interface ClosetComparison {
  summaryText: string | null;
  similarItems: ComparisonItem[];
}

export interface WardrobeDecision {
  id: string;
  candidateId: string | null;
  /** Raw server value — always render `decisionText` even when unknown. */
  decision: string;
  /** Null on version skew: render server texts with NO decision-specific
   * styling or actions (contract §3, frozen). */
  knownDecision: PurchaseDecisionValue | null;
  decisionText: string;
  reasons: DecisionReason[];
  closetComparison: ClosetComparison;
  uncertainty: DecisionUncertainty | null;
  /** Unknown degrades to 'none': no preview entry is shown. */
  visualNeed: DecisionVisualNeed;
  boundaryNote: string | null;
  /** Unknown actions are dropped — a button must lead somewhere real. */
  nextActions: DecisionNextAction[];
  createdAt: string;
}

// --- Mapping ----------------------------------------------------------------

function includes<T extends string>(values: readonly T[], raw: unknown): raw is T {
  return typeof raw === 'string' && (values as readonly string[]).includes(raw);
}

function strOrNull(raw: unknown): string | null {
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function strList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === 'string') : [];
}

export function toParsedCandidateItem(
  raw: ServerParsedCandidateItem | null | undefined,
): ParsedCandidateItem | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    category: strOrNull(raw.category),
    colors: strList(raw.colors),
    silhouette: strOrNull(raw.silhouette),
    materialHints: strList(raw.material_hints),
    price: strOrNull(raw.price),
    sceneTags: strList(raw.scene_tags),
  };
}

/** Only `submitted` is non-terminal. Unknown ⇒ terminal (frozen skew rule). */
export function isTerminalCandidateStatus(status: string): boolean {
  return status !== 'submitted';
}

export function toPurchaseCandidate(raw: ServerPurchaseCandidate): PurchaseCandidate {
  return {
    id: raw.id,
    status: raw.status,
    isTerminal: isTerminalCandidateStatus(raw.status),
    parsedItem: toParsedCandidateItem(raw.parsed_item),
  };
}

function toReason(raw: ServerDecisionReason): DecisionReason {
  return {
    kind: raw.kind,
    isKnownKind: includes(DECISION_REASON_KINDS, raw.kind),
    text: raw.text,
  };
}

function toComparisonItem(raw: ServerComparisonItem): ComparisonItem {
  return {
    itemId: raw.item_id,
    imageUrl: strOrNull(raw.image_url),
    relation: includes(COMPARISON_RELATIONS, raw.relation) ? raw.relation : null,
  };
}

function toClosetComparison(raw: ServerClosetComparison | null | undefined): ClosetComparison {
  if (!raw || typeof raw !== 'object') {
    // A missing optional V3 block means "not available", never an error.
    return { summaryText: null, similarItems: [] };
  }
  return {
    summaryText: strOrNull(raw.summary_text),
    similarItems: (raw.similar_items ?? []).map(toComparisonItem),
  };
}

export function toWardrobeDecision(raw: ServerWardrobeDecision): WardrobeDecision {
  return {
    id: raw.id,
    candidateId: strOrNull(raw.candidate_id),
    decision: raw.decision,
    knownDecision: includes(PURCHASE_DECISIONS, raw.decision) ? raw.decision : null,
    decisionText: raw.decision_text,
    reasons: (raw.reasons ?? []).map(toReason),
    closetComparison: toClosetComparison(raw.closet_comparison),
    uncertainty: includes(DECISION_UNCERTAINTIES, raw.uncertainty) ? raw.uncertainty : null,
    visualNeed: includes(DECISION_VISUAL_NEEDS, raw.visual_need) ? raw.visual_need : 'none',
    boundaryNote: strOrNull(raw.boundary_note),
    nextActions: (raw.next_actions ?? []).filter((a): a is DecisionNextAction =>
      includes(DECISION_NEXT_ACTIONS, a),
    ),
    createdAt: raw.created_at,
  };
}

// --- Known error states → actionable UI states (feature acceptance 3) -------

/**
 * The BE advertises these in OpenAPI (`_CREATE_ERRORS` / `_READ_ERRORS`):
 * 503 flag-off, 404 not-found-or-foreign, 400 unsafe URL, 422 validation.
 * 401/429/5xx/network come from the shared middleware stack. Each maps to one
 * actionable state so no screen ever shows a dead end or a silent failure.
 */
export type DecisionErrorState =
  /** `ENABLE_V3_PURCHASE_DECISION` off (503): hide the entry point, show
   * "feature not open yet". Retrying cannot help the user. */
  | { kind: 'feature_unavailable'; retryable: false }
  /** 404 — foreign or deleted resource (indistinguishable by contract §3):
   * leave the flow and refresh whatever list led here. */
  | { kind: 'not_found'; retryable: false }
  /** 400 — the link failed the safety check: let the user edit the URL or
   * switch to a screenshot source. */
  | { kind: 'invalid_source'; retryable: false; message: string | null }
  /** 422 — request validation: fix the input and resubmit. */
  | { kind: 'invalid_request'; retryable: false; message: string | null }
  /** 401 — the shared client interceptor already refreshes or signs out;
   * the surface just backs out. */
  | { kind: 'session_expired'; retryable: false }
  /** 429 — wait and retry. */
  | { kind: 'rate_limited'; retryable: true }
  /** Other 5xx — server-side incident: offer an explicit retry action. */
  | { kind: 'server_error'; retryable: true }
  /** No response at all — connectivity: offer an explicit retry action. */
  | { kind: 'network'; retryable: true }
  /** The candidate was still `submitted` after the bounded parse wait. Not an
   * HTTP failure and not mapped from a status: raised by the caller so a slow
   * asynchronous parse asks for a retry instead of asking the server to decide
   * on evidence that does not exist yet (codex review, FE#141). */
  | { kind: 'parse_pending'; retryable: true };

/** Sentinel the decision flow throws when the parse wait runs out. Structural
 * (not an Error subclass) so this module stays runtime-import-free. */
export const PARSE_PENDING = { v3ParsePending: true } as const;

export function isParsePending(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'v3ParsePending' in error;
}

/** The minimal axios-error surface this module reads; kept structural so the
 * mapping stays runtime-import-free and Node-testable. */
export interface HttpErrorLike {
  response?: {
    status?: number | null;
    data?: { message?: string | null } | null;
  } | null;
}

/** Which §5.1 endpoint produced the error. Only `create` changes mapping:
 * its documented 404 is "submitted object key outside the caller's prefix"
 * (docs/openapi.yaml, POST /v1/purchase-candidates) — an INPUT error whose
 * recovery is re-selecting the source, not the leave-and-refresh flow that
 * `not_found` prescribes for missing resources (codex review, FE#137). */
export type DecisionEndpointContext = 'create' | 'read' | 'decide';

export function toDecisionErrorState(
  error: HttpErrorLike | null | undefined,
  context: DecisionEndpointContext = 'read',
): DecisionErrorState {
  if (isParsePending(error)) return { kind: 'parse_pending', retryable: true };
  const status = error?.response?.status ?? null;
  const message = strOrNull(error?.response?.data?.message);
  if (status === null) return { kind: 'network', retryable: true };
  if (status === 503) return { kind: 'feature_unavailable', retryable: false };
  if (status === 404) {
    if (context === 'create') return { kind: 'invalid_source', retryable: false, message };
    return { kind: 'not_found', retryable: false };
  }
  if (status === 400) return { kind: 'invalid_source', retryable: false, message };
  if (status === 422) return { kind: 'invalid_request', retryable: false, message };
  if (status === 401) return { kind: 'session_expired', retryable: false };
  if (status === 429) return { kind: 'rate_limited', retryable: true };
  if (status >= 500) return { kind: 'server_error', retryable: true };
  // An unadvertised 4xx: treat like validation — actionable, not retryable.
  return { kind: 'invalid_request', retryable: false, message };
}
