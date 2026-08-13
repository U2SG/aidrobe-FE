// V3-009 — pure presentation logic for the Should-I-Buy decision card
// (V3_SPEC §5.4 / §9.2). Runtime-import-free so the Node regression runner
// loads it directly (`scripts/shouldIBuyDecision.test.ts`, the
// `purchaseDecisionMapping.ts` pattern); all imports are type-only.
//
// The card renders §5.4's layers WITHOUT the conditional visual-preview layer:
// no avatar surface exists yet (V3-014/V3-015) and no preview lifecycle exists
// yet (V3-019/V3-020), so `visual_need` is deliberately not consumed here —
// per the frozen contract it only *grades a preview entry's weight*, and an
// entry that leads nowhere real must not render. The page is complete without
// it (feature acceptance 1; contract §5.3 "the full no-avatar experience is
// complete").
import type {
  CandidateSourceType,
  ComparisonItem,
  ComparisonRelation,
  DecisionErrorState,
  DecisionNextAction,
  DecisionReason,
  DecisionUncertainty,
  PurchaseCandidate,
  PurchaseDecisionValue,
  WardrobeDecision,
} from '@/api/purchaseDecisionMapping';
import type { I18nKey } from '@/i18n';

export type DecisionTone = 'positive' | 'caution' | 'negative' | 'neutral';

/** One calm tone per frozen decision state — tone styles the ONE emphasized
 * judgment block and nothing else (§5.4 layer 1: no scores, no gauges). */
export const DECISION_TONES: Record<PurchaseDecisionValue, DecisionTone> = {
  worth_adding: 'positive',
  consider_alternate: 'caution',
  wait: 'caution',
  avoid_duplicate: 'negative',
  insufficient_information: 'neutral',
};

/** Unknown decision (version skew) ⇒ null: render the server texts with no
 * decision-specific styling or actions (contract §3, frozen). */
export function decisionTone(knownDecision: PurchaseDecisionValue | null): DecisionTone | null {
  return knownDecision ? DECISION_TONES[knownDecision] : null;
}

/** §5.4 layer 2 is "the most important 2–3 reasons". The server guarantees
 * 2–3 and orders by importance; a newer BE sending more must not overflow the
 * layer, so the card renders at most the first three. */
export const MAX_REASONS = 3;

/** Actions the V3-009 card renders. `style_with_existing` is deliberately NOT
 * here: its real behavior (open/create an owned-items outfit and return to
 * this context) is feature V3-010, and a button that leads nowhere real must
 * not render. The existing-item alternative is still VISIBLE when relevant
 * through the closet-comparison layer (feature acceptance 3). Unknown wire
 * values were already dropped by `toWardrobeDecision`. */
export const RENDERED_ACTIONS = ['add_to_candidates', 'skip', 'recheck_color'] as const;
export type RenderedAction = (typeof RENDERED_ACTIONS)[number];

export function renderableActions(nextActions: DecisionNextAction[]): RenderedAction[] {
  return nextActions.filter((a): a is RenderedAction =>
    (RENDERED_ACTIONS as readonly string[]).includes(a),
  );
}

export const ACTION_LABEL_KEYS: Record<RenderedAction, I18nKey> = {
  add_to_candidates: 'should_i_buy.action.addToCandidates',
  skip: 'should_i_buy.action.skip',
  recheck_color: 'should_i_buy.action.recheckColor',
};

/** Comparison-item relation labels (§5.4 layer 3). A skewed unknown relation
 * maps to null in the wire layer and renders no tag rather than a guess. */
export const RELATION_LABEL_KEYS: Record<ComparisonRelation, I18nKey> = {
  covers: 'should_i_buy.relation.covers',
  complements: 'should_i_buy.relation.complements',
};

/** §5.4 layer 1 states the judgment; the frozen `uncertainty` band qualifies
 * how far to trust it. Only `medium`/`high` render — a `low` caveat would be
 * noise, and an unknown band (version skew) says nothing we can stand behind.
 * It renders as a quiet caption, never a second badge, so the judgment keeps
 * the page's only emphasis (feature acceptance 2). */
export const UNCERTAINTY_CAVEAT_KEYS: Record<DecisionUncertainty, I18nKey | null> = {
  low: null,
  medium: 'should_i_buy.uncertainty.medium',
  high: 'should_i_buy.uncertainty.high',
};

export function uncertaintyCaveatKey(uncertainty: DecisionUncertainty | null): I18nKey | null {
  return uncertainty ? UNCERTAINTY_CAVEAT_KEYS[uncertainty] : null;
}

/** §9.2's product header. The frozen §5.2 candidate carries no product name and
 * no thumbnail — only parsed attributes — so the header is built from those
 * instead of inventing a title. `parseIncomplete` drives the partial-parse note:
 * a candidate the parser could not read still reaches a decision, and the page
 * says so rather than failing silently (§5.2). */
export interface CandidateSummary {
  category: string | null;
  colors: string[];
  price: string | null;
  parseIncomplete: boolean;
}

export function candidateSummary(candidate: PurchaseCandidate): CandidateSummary {
  const parsed = candidate.parsedItem;
  return {
    category: parsed?.category ?? null,
    colors: parsed?.colors ?? [],
    price: parsed?.price ?? null,
    // `parse_failed` carries no parsed_item at all; a parsed candidate whose
    // category is missing is equally unreadable for header purposes.
    parseIncomplete: !parsed || parsed.category === null,
  };
}

/** The card's two §5.2 entrances. An uploaded product photo is a `screenshot`;
 * `order_image` and `ask_link` are other features' entrances into the same
 * decision API, not this screen's. */
export function sourceTypeForInput(hasImage: boolean): CandidateSourceType {
  return hasImage ? 'screenshot' : 'share_link';
}

/** The decision card view. Exactly ONE field carries emphasis (feature
 * acceptance 2: only one clear decision is emphasized); every other layer is
 * supporting detail. A `null` section means the layer is absent from the tree
 * entirely — not rendered-but-empty (low-density rule). */
export interface DecisionCardView {
  emphasis: { text: string; tone: DecisionTone | null };
  reasons: DecisionReason[];
  comparison: { summaryText: string | null; items: ComparisonItem[] } | null;
  boundaryNote: string | null;
  actions: RenderedAction[];
}

export function buildDecisionCard(decision: WardrobeDecision): DecisionCardView {
  const { summaryText, similarItems } = decision.closetComparison;
  const hasComparison = summaryText !== null || similarItems.length > 0;
  return {
    emphasis: { text: decision.decisionText, tone: decisionTone(decision.knownDecision) },
    reasons: decision.reasons.slice(0, MAX_REASONS),
    comparison: hasComparison ? { summaryText, items: similarItems } : null,
    boundaryNote: decision.boundaryNote,
    actions: renderableActions(decision.nextActions),
  };
}

/** `v3_decision_viewed` requires the frozen enum; a skewed unknown decision is
 * rendered (server copy) but never emitted — the validator would reject it. */
export function viewedEventDecision(decision: WardrobeDecision): PurchaseDecisionValue | null {
  return decision.knownDecision;
}

/** Error card copy per `DecisionErrorState` kind (V3-008 acceptance 3
 * consumed here): every state renders a message and either an explicit retry
 * or a way back — no dead end, no silent failure. Whether retry is offered
 * comes from the state's own `retryable` (single source: the mapping layer).
 * `feature_unavailable` is the skew path only: the entry point itself is
 * flag-gated and self-hiding. */
export const ERROR_MESSAGE_KEYS: Record<DecisionErrorState['kind'], I18nKey> = {
  feature_unavailable: 'should_i_buy.error.featureUnavailable',
  not_found: 'should_i_buy.error.notFound',
  invalid_source: 'should_i_buy.error.invalidSource',
  invalid_request: 'should_i_buy.error.invalidRequest',
  session_expired: 'should_i_buy.error.sessionExpired',
  rate_limited: 'should_i_buy.error.rateLimited',
  server_error: 'should_i_buy.error.serverError',
  network: 'should_i_buy.error.network',
};

export function errorView(state: DecisionErrorState): {
  messageKey: I18nKey;
  retryable: boolean;
  detail: string | null;
} {
  // 400/422 carry an actionable server message (e.g. which input was unsafe).
  const detail = 'message' in state ? state.message : null;
  return { messageKey: ERROR_MESSAGE_KEYS[state.kind], retryable: state.retryable, detail };
}
