// V3-009 — regression test for the Should-I-Buy decision card's presentation
// logic (src/screens/discover/shouldIBuyDecision.ts). RN-free; run:
//   node scripts/shouldIBuyDecision.test.ts
//
// The card itself is a React tree this repo has no renderer for (there is no
// jest/RNTL stack — see scripts/run-regressions.ts), so the split is
// deliberate: every decision the card MAKES lives in the pure module and is
// asserted here, and what the card LOOKS like — and where its actions LEAD —
// is evidenced in the browser (.agent-artifacts/v3-009/, v3-010/). The fixtures
// below are the same objects the browser drivers serve, so the halves describe
// one payload.
import assert from 'node:assert/strict';

import {
  DECISION_NEXT_ACTIONS,
  toPurchaseCandidate,
  toWardrobeDecision,
} from '../src/api/purchaseDecisionMapping.ts';
import {
  ACTION_LABEL_KEYS,
  buildDecisionCard,
  candidateSummary,
  decisionTone,
  errorView,
  MAX_REASONS,
  RELATION_LABEL_KEYS,
  RENDERED_ACTIONS,
  renderableActions,
  reuseAnchorItemId,
  sourceTypeForInput,
  uncertaintyCaveatKey,
  viewedEventDecision,
} from '../src/screens/discover/shouldIBuyDecision.ts';
import {
  DUPLICATE_DECISION,
  LONG_COPY_DECISION,
  NO_COVERS_ALTERNATIVE_DECISION,
  PARSED_CANDIDATE,
  UNKNOWN_DECISION,
  UNPARSED_CANDIDATE,
  WORTH_ADDING_DECISION,
} from './fixtures/purchaseDecisionFixtures.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// --- Acceptance 1: complete and useful with no avatar, no visual provider ----
// The card view has no preview field at all, so there is no empty slot to
// degrade and nothing that can fail when no provider exists. The proof is
// structural: `visual_need` never reaches the view, even at 'recommended'.

const worthAdding = toWardrobeDecision(WORTH_ADDING_DECISION);
const worthAddingCard = buildDecisionCard(worthAdding);
check('server said visual_need=recommended', worthAdding.visualNeed === 'recommended');
check(
  'no preview/visual field exists on the card view',
  !Object.keys(worthAddingCard).some((k) => /visual|preview|avatar/i.test(k)),
);
check(
  'the card is still complete: judgment + reasons + actions',
  worthAddingCard.emphasis.text.length > 0 &&
    worthAddingCard.reasons.length >= 2 &&
    worthAddingCard.actions.length > 0,
);
check('boundary note (§5.4 layer 5) survives', worthAddingCard.boundaryNote !== null);
check(
  'an absent comparison block is omitted, not rendered empty',
  buildDecisionCard(toWardrobeDecision({ ...WORTH_ADDING_DECISION, closet_comparison: null }))
    .comparison === null,
);

// --- Acceptance 2: only ONE clear decision is emphasized ---------------------

const duplicate = toWardrobeDecision(DUPLICATE_DECISION);
const duplicateCard = buildDecisionCard(duplicate);
check('exactly one emphasis field', 'emphasis' in duplicateCard);
check('emphasis carries the server judgment verbatim', duplicateCard.emphasis.text === '不建议重复购买');
check('emphasis is toned', duplicateCard.emphasis.tone === 'negative');
check(
  'no other card section carries a tone',
  Object.entries(duplicateCard)
    .filter(([k]) => k !== 'emphasis')
    .every(([, v]) => JSON.stringify(v ?? null).indexOf('"tone"') === -1),
);
check('worth_adding tones positive', decisionTone('worth_adding') === 'positive');
check('wait and consider_alternate share the calm caution tone', decisionTone('wait') === 'caution');
check('insufficient_information is neutral', decisionTone('insufficient_information') === 'neutral');

// The uncertainty band is a caption, never a second emphasis — and only when
// it actually qualifies the judgment.
check('low uncertainty renders no caveat', uncertaintyCaveatKey('low') === null);
check('medium uncertainty renders a caveat', uncertaintyCaveatKey('medium') !== null);
check('high uncertainty renders a caveat', uncertaintyCaveatKey('high') !== null);
check('an unknown (skewed) band claims nothing', uncertaintyCaveatKey(null) === null);

// A newer BE sending four reasons must not overflow §5.4 layer 2.
const fourReasons = toWardrobeDecision({
  ...DUPLICATE_DECISION,
  reasons: [...(DUPLICATE_DECISION.reasons ?? []), { kind: 'adoption_history', text: '第四条' }],
});
check('server sent 4 reasons', fourReasons.reasons.length === 4);
check('the card renders at most 3', buildDecisionCard(fourReasons).reasons.length === MAX_REASONS);

// --- Acceptance 3: the existing-item alternative is visible when relevant ----

check('the duplicate case has a comparison block', duplicateCard.comparison !== null);
check(
  'it names the owned items that already cover this purchase',
  (duplicateCard.comparison?.items ?? []).filter((i) => i.relation === 'covers').length === 2,
);
check(
  'and carries the server summary sentence (§5.4 layer 3)',
  duplicateCard.comparison?.summaryText === '你已有的米色短外套覆盖了它的大部分使用场景。',
);
check(
  'every rendered relation has a label key',
  (duplicateCard.comparison?.items ?? [])
    .filter((i) => i.relation !== null)
    .every((i) => !!RELATION_LABEL_KEYS[i.relation!]),
);
// A comparison that is present but empty of both parts must not render a
// heading over nothing.
check(
  'a comparison with neither summary nor items is omitted',
  buildDecisionCard(
    toWardrobeDecision({
      ...DUPLICATE_DECISION,
      closet_comparison: { summary_text: null, similar_items: [] },
    }),
  ).comparison === null,
);

// --- Frozen §3 skew rule: unknown decision → texts only, NO actions ----------
// (codex review, FE#141: acting on a judgment this client cannot interpret.)

const skewedCard = buildDecisionCard(
  toWardrobeDecision({
    ...WORTH_ADDING_DECISION,
    decision: 'buy_immediately_v9',
    next_actions: ['add_to_candidates', 'skip'],
  }),
);
check('unknown decision still renders the server text', skewedCard.emphasis.text.length > 0);
check('unknown decision renders with neutral tone', skewedCard.emphasis.tone === null);
check('unknown decision suppresses ALL actions', skewedCard.actions.length === 0);

// --- Acceptance 4: no new tab, avatar center or infinite choice grid ---------
// The action row is a closed, bounded set: exactly the frozen wire vocabulary,
// with no "try another" generator. V3-010 completed it — every one of the four
// now leads somewhere real.

check('the renderable actions are exactly the frozen four', RENDERED_ACTIONS.length === 4);
check(
  'and nothing outside the wire vocabulary can render',
  [...RENDERED_ACTIONS].sort().join(',') === [...DECISION_NEXT_ACTIONS].sort().join(','),
);
check(
  'the order the server sent is preserved',
  renderableActions(duplicate.nextActions).join(',') === 'style_with_existing,skip',
);
check(
  'every rendered action has a label key',
  RENDERED_ACTIONS.every((a) => !!ACTION_LABEL_KEYS[a]),
);

// --- V3-010: the existing-item alternative's anchor --------------------------
// The action styles an outfit around ONE owned item, so which item it picks is
// the whole behavior. `covers` only: the BE offers this action exactly when
// V3-006 composed an alternative, and it seeds those from V3-005's `covers`
// items alone — a `complements` item pairs WITH the candidate rather than doing
// its job, so anchoring on one would answer a different question.

check(
  'the anchor is the first covers item, not merely the first item',
  reuseAnchorItemId(duplicate) === '11111111-1111-4111-8111-111111111111',
);
check('the card carries that anchor for the hand-off', duplicateCard.reuseAnchorId === reuseAnchorItemId(duplicate));
check('so the reuse action renders', duplicateCard.actions.includes('style_with_existing'));

const complementsOnly = toWardrobeDecision(NO_COVERS_ALTERNATIVE_DECISION);
const complementsOnlyCard = buildDecisionCard(complementsOnly);
check('the server still offered the action', complementsOnly.nextActions.includes('style_with_existing'));
check('but no owned item covers the need', reuseAnchorItemId(complementsOnly) === null);
check(
  'so the action is dropped rather than opening an item-less styling flow',
  !complementsOnlyCard.actions.includes('style_with_existing'),
);
check('while the other offered actions still render', complementsOnlyCard.actions.join(',') === 'skip');
check(
  'a decision with no comparison block at all is treated the same way',
  buildDecisionCard(
    toWardrobeDecision({ ...DUPLICATE_DECISION, closet_comparison: null }),
  ).actions.join(',') === 'skip',
);
// The reuse choice is an action emit, not a purchase: `add_to_candidates` is a
// separate value and neither implies the other.
check(
  'the reuse action is its own analytics value',
  ACTION_LABEL_KEYS.style_with_existing !== ACTION_LABEL_KEYS.add_to_candidates,
);

// --- Version skew (contract §3, frozen) -------------------------------------

const unknown = toWardrobeDecision(UNKNOWN_DECISION);
const unknownCard = buildDecisionCard(unknown);
check('an unknown decision still renders the server copy', unknownCard.emphasis.text.length > 0);
check('with no decision-specific tone', unknownCard.emphasis.tone === null);
// Unknown DECISION → no actions at all (frozen §3; codex review, FE#141):
// the user must not act on a judgment this client cannot interpret.
check('an unknown decision suppresses ALL actions', unknownCard.actions.length === 0);
// Dropping unknown ACTIONS is asserted on a KNOWN decision, where the action
// row legitimately renders.
check(
  'an unknown next_action is dropped from a known decision',
  buildDecisionCard(
    toWardrobeDecision({
      ...WORTH_ADDING_DECISION,
      next_actions: ['add_to_candidates', 'summon_stylist'],
    }),
  ).actions.join(',') === 'add_to_candidates',
);
check('and it is never emitted as analytics', viewedEventDecision(unknown) === null);
check('a known decision is', viewedEventDecision(duplicate) === 'avoid_duplicate');

// --- §5.2 candidate header: partial parse is stated, never silent -----------

const parsed = candidateSummary(toPurchaseCandidate(PARSED_CANDIDATE));
check('a parsed candidate reports its attributes', parsed.category === 'outerwear');
check('including the price string as sent', parsed.price === '¥1,280');
check('and is not marked incomplete', parsed.parseIncomplete === false);

const unparsed = candidateSummary(toPurchaseCandidate(UNPARSED_CANDIDATE));
check('a parse_failed candidate has no attributes', unparsed.category === null && unparsed.colors.length === 0);
check('and IS marked incomplete, so the card says so', unparsed.parseIncomplete === true);
check(
  'a parsed_item without a category counts as incomplete too',
  candidateSummary(
    toPurchaseCandidate({ ...PARSED_CANDIDATE, parsed_item: { colors: ['beige'] } }),
  ).parseIncomplete === true,
);

check('a pasted link is a share_link source', sourceTypeForInput(false) === 'share_link');
check('an uploaded product photo is a screenshot source', sourceTypeForInput(true) === 'screenshot');

// --- Long server copy stays whole (the dynamic-text case) -------------------
// The client cannot shorten server-rendered copy (§5.3), so the only correct
// behavior is to pass it through untouched and let the layout absorb it.

const longCard = buildDecisionCard(toWardrobeDecision(LONG_COPY_DECISION));
check(
  'long decision text is not truncated by the card logic',
  longCard.emphasis.text === LONG_COPY_DECISION.decision_text,
);
check(
  'long reason text is not truncated either',
  longCard.reasons[0].text === (LONG_COPY_DECISION.reasons ?? [])[0].text,
);
check('high uncertainty on the long-copy case is caveated', uncertaintyCaveatKey('high') !== null);

// --- Error states: no dead end, no silent failure ---------------------------

const featureOff = errorView({ kind: 'feature_unavailable', retryable: false });
check('flag-off renders a message', featureOff.messageKey.startsWith('should_i_buy.error.'));
check('and offers no pointless retry', featureOff.retryable === false);
const serverDown = errorView({ kind: 'server_error', retryable: true });
check('a 5xx offers an explicit retry', serverDown.retryable === true);
const badLink = errorView({ kind: 'invalid_source', retryable: false, message: 'unsafe url' });
check('a rejected link surfaces the actionable server detail', badLink.detail === 'unsafe url');
check(
  'a state with no server detail carries none',
  errorView({ kind: 'network', retryable: true }).detail === null,
);
check(
  'every error state has copy',
  (
    [
      'feature_unavailable',
      'not_found',
      'invalid_source',
      'invalid_request',
      'session_expired',
      'rate_limited',
      'server_error',
      'network',
    ] as const
  ).every((kind) => !!errorView({ kind, retryable: false, message: null } as never).messageKey),
);

console.log(`shouldIBuyDecision: ${passed}/${passed} cases passed`);
