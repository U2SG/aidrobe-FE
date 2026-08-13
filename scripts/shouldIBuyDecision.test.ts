// V3-009 — regression test for the Should-I-Buy decision card's presentation
// logic (src/screens/discover/shouldIBuyDecision.ts). RN-free; run:
//   node scripts/shouldIBuyDecision.test.ts
//
// The card itself is a React tree this repo has no renderer for (there is no
// jest/RNTL stack — see scripts/run-regressions.ts), so the split is
// deliberate: every decision the card MAKES lives in the pure module and is
// asserted here, and what the card LOOKS like is evidenced in the browser
// (.agent-artifacts/v3-009/). The fixtures below are the same objects the
// browser driver serves, so the two halves describe one payload.
import assert from 'node:assert/strict';

import { toPurchaseCandidate, toWardrobeDecision } from '../src/api/purchaseDecisionMapping.ts';
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
  sourceTypeForInput,
  uncertaintyCaveatKey,
  viewedEventDecision,
} from '../src/screens/discover/shouldIBuyDecision.ts';
import {
  DUPLICATE_DECISION,
  LONG_COPY_DECISION,
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

// --- Acceptance 4: no new tab, avatar center or infinite choice grid ---------
// The action row is a closed, bounded set — three entries, no "try another"
// generator, and `style_with_existing` withheld until V3-010 gives it a real
// destination.

check('exactly three renderable actions', RENDERED_ACTIONS.length === 3);
check(
  'style_with_existing is not among them',
  !(RENDERED_ACTIONS as readonly string[]).includes('style_with_existing'),
);
check(
  'the server offering it does not add a button',
  !renderableActions(duplicate.nextActions).includes('style_with_existing' as never),
);
check(
  'but the other offered actions do render',
  renderableActions(duplicate.nextActions).join(',') === 'skip,recheck_color',
);
check(
  'every rendered action has a label key',
  RENDERED_ACTIONS.every((a) => !!ACTION_LABEL_KEYS[a]),
);

// --- Version skew (contract §3, frozen) -------------------------------------

const unknown = toWardrobeDecision(UNKNOWN_DECISION);
const unknownCard = buildDecisionCard(unknown);
check('an unknown decision still renders the server copy', unknownCard.emphasis.text.length > 0);
check('with no decision-specific tone', unknownCard.emphasis.tone === null);
check('an unknown next_action is dropped', unknownCard.actions.join(',') === 'add_to_candidates');
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
