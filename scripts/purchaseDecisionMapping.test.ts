// V3-008 — mapping unit test for the purchase-decision wire mapping
// (src/api/purchaseDecisionMapping.ts). Covers the feature's acceptance 2
// (optional evidence and visual metadata are nullable) and 3 (known error
// states map to actionable UI states), plus the frozen §3 version-skew rules.
// RN-free; run: node scripts/purchaseDecisionMapping.test.ts
import assert from 'node:assert/strict';

import {
  isParsePending,
  isTerminalCandidateStatus,
  PARSE_PENDING,
  toDecisionErrorState,
  toParsedCandidateItem,
  toPurchaseCandidate,
  toWardrobeDecision,
  type ServerWardrobeDecision,
} from '../src/api/purchaseDecisionMapping.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// --- A full §5.3 payload maps snake→camel faithfully ------------------------

const FULL_DECISION: ServerWardrobeDecision = {
  id: 'a1b2c3d4-0000-4000-8000-000000000001',
  candidate_id: 'a1b2c3d4-0000-4000-8000-000000000002',
  decision: 'avoid_duplicate',
  decision_text: '你已经有一件很相似的灰色大衣。',
  reasons: [
    { kind: 'redundancy', text: '衣橱里有 3 件同类单品。' },
    { kind: 'compatibility', text: '现有单品即可搭出完整造型。' },
  ],
  closet_comparison: {
    summary_text: '最相似：灰色羊毛大衣',
    similar_items: [
      {
        item_id: 'a1b2c3d4-0000-4000-8000-000000000003',
        image_url: 'https://signed.example.com/coat.jpg?token=x',
        relation: 'covers',
      },
      { item_id: 'a1b2c3d4-0000-4000-8000-000000000004', image_url: null, relation: 'complements' },
    ],
  },
  uncertainty: 'low',
  visual_need: 'none',
  boundary_note: '此判断针对整体造型，不构成尺码或合身保证。',
  next_actions: ['style_with_existing', 'skip'],
  created_at: '2026-08-08T02:00:00Z',
};

const full = toWardrobeDecision(FULL_DECISION);
check('decision passes through', full.decision === 'avoid_duplicate');
check('known decision recognized', full.knownDecision === 'avoid_duplicate');
check('decision_text → decisionText', full.decisionText === FULL_DECISION.decision_text);
check('reasons keep order and text', full.reasons[1]?.text === '现有单品即可搭出完整造型。');
check('known reason kind flagged', full.reasons.every((r) => r.isKnownKind));
check('summary_text → summaryText', full.closetComparison.summaryText === '最相似：灰色羊毛大衣');
check('item_id → itemId', full.closetComparison.similarItems[0]?.itemId?.endsWith('03') === true);
check('signed image url passes through', full.closetComparison.similarItems[0]?.imageUrl !== null);
check('null image url stays null (acceptance 2)', full.closetComparison.similarItems[1]?.imageUrl === null);
check('relation recognized', full.closetComparison.similarItems[0]?.relation === 'covers');
check('uncertainty recognized', full.uncertainty === 'low');
check('visual_need recognized', full.visualNeed === 'none');
check('boundary note kept', full.boundaryNote !== null);
check('next actions kept', full.nextActions.length === 2);
check('created_at kept', full.createdAt === '2026-08-08T02:00:00Z');

// --- Acceptance 2: optional evidence / visual metadata are nullable ---------

const sparse = toWardrobeDecision({
  id: 'a1b2c3d4-0000-4000-8000-000000000005',
  candidate_id: null,
  decision: 'insufficient_information',
  decision_text: 'Not enough information to compare.',
  reasons: null,
  closet_comparison: null,
  uncertainty: 'high',
  visual_need: null,
  boundary_note: null,
  next_actions: null,
  created_at: '2026-08-08T02:00:00Z',
});
check('null candidate_id → null', sparse.candidateId === null);
check('missing reasons → empty list, no throw', sparse.reasons.length === 0);
check('missing closet_comparison → empty block', sparse.closetComparison.similarItems.length === 0);
check('missing summary → null', sparse.closetComparison.summaryText === null);
check('missing visual_need degrades to none', sparse.visualNeed === 'none');
check('missing boundary_note → null', sparse.boundaryNote === null);
check('missing next_actions → empty list', sparse.nextActions.length === 0);

// --- Frozen §3 version-skew rules -------------------------------------------

const skewed = toWardrobeDecision({
  ...FULL_DECISION,
  decision: 'buy_immediately_v9',
  uncertainty: 'cosmic',
  visual_need: 'mandatory_hologram',
  next_actions: ['style_with_existing', 'summon_stylist'],
  reasons: [{ kind: 'astrology', text: 'Server copy still renders.' }],
});
check('unknown decision keeps raw value', skewed.decision === 'buy_immediately_v9');
check('unknown decision → knownDecision null (texts-only render)', skewed.knownDecision === null);
check('server copy still available on skew', skewed.decisionText.length > 0);
check('unknown uncertainty → null', skewed.uncertainty === null);
check('unknown visual_need → none (no preview entry)', skewed.visualNeed === 'none');
check('unknown next_action dropped', skewed.nextActions.length === 1);
check('known next_action survives the filter', skewed.nextActions[0] === 'style_with_existing');
check('unknown reason kind keeps its text', skewed.reasons[0]?.text === 'Server copy still renders.');
check('unknown reason kind flagged unknown', skewed.reasons[0]?.isKnownKind === false);

// --- Candidate mapping and the no-spin polling rule --------------------------

const parsedCandidate = toPurchaseCandidate({
  id: 'c1',
  status: 'parsed',
  parsed_item: { category: 'outerwear', colors: ['gray'], material_hints: null },
});
check('parsed status is terminal', parsedCandidate.isTerminal === true);
check('parsed_item mapped', parsedCandidate.parsedItem?.category === 'outerwear');
check('null material_hints → empty list (acceptance 2)', parsedCandidate.parsedItem?.materialHints.length === 0);
check('absent silhouette → null', parsedCandidate.parsedItem?.silhouette === null);

const failedCandidate = toPurchaseCandidate({ id: 'c2', status: 'parse_failed', parsed_item: null });
check('parse_failed is terminal', failedCandidate.isTerminal === true);
check('parse_failed keeps null parsed_item (editable-partial UI)', failedCandidate.parsedItem === null);

check('submitted is the only non-terminal status', isTerminalCandidateStatus('submitted') === false);
check('unknown status is terminal — no spin on skew', isTerminalCandidateStatus('quantum_parsing') === true);
check('toParsedCandidateItem(null) is null', toParsedCandidateItem(null) === null);

// --- Acceptance 3: known error states → actionable UI states -----------------

const err = (status: number | null, message?: string) =>
  status === null ? {} : { response: { status, data: message ? { message } : null } };

check('503 → feature_unavailable', toDecisionErrorState(err(503)).kind === 'feature_unavailable');
check('503 not retryable', toDecisionErrorState(err(503)).retryable === false);
check('404 → not_found', toDecisionErrorState(err(404)).kind === 'not_found');
// Endpoint context (codex review, FE#137): the create POST's documented 404 is
// an invalid source-asset key — an input error the user can fix by picking the
// source again — while read/decide 404s stay leave-the-flow not_found.
const createBad = toDecisionErrorState(err(404, 'unknown object key'), 'create');
check('create 404 → invalid_source', createBad.kind === 'invalid_source');
check(
  'create 404 carries the server message',
  createBad.kind === 'invalid_source' && createBad.message === 'unknown object key',
);
check('read 404 stays not_found', toDecisionErrorState(err(404), 'read').kind === 'not_found');
check('decide 404 stays not_found', toDecisionErrorState(err(404), 'decide').kind === 'not_found');
const bad = toDecisionErrorState(err(400, 'unsafe url'));
check('400 → invalid_source', bad.kind === 'invalid_source');
check('400 carries the server message', bad.kind === 'invalid_source' && bad.message === 'unsafe url');
check('422 → invalid_request', toDecisionErrorState(err(422)).kind === 'invalid_request');
check('401 → session_expired', toDecisionErrorState(err(401)).kind === 'session_expired');
check('429 → rate_limited, retryable', toDecisionErrorState(err(429)).retryable === true);
check('500 → server_error, retryable', toDecisionErrorState(err(500)).kind === 'server_error');
check('no response → network, retryable', toDecisionErrorState(err(null)).kind === 'network');
check('undefined error → network', toDecisionErrorState(undefined).kind === 'network');
check('unadvertised 4xx → invalid_request', toDecisionErrorState(err(418)).kind === 'invalid_request');

// A still-`submitted` candidate after the bounded parse wait is not an HTTP
// failure: deciding anyway would ask the server to judge evidence that does not
// exist yet (codex review, FE#141), so the caller raises this sentinel and the
// user gets a retry rather than a premature verdict.
const pending = toDecisionErrorState(PARSE_PENDING as never);
check('PARSE_PENDING → parse_pending', pending.kind === 'parse_pending');
check('parse_pending is retryable', pending.retryable === true);
check('isParsePending recognises the sentinel', isParsePending(PARSE_PENDING) === true);
check('isParsePending ignores an http error', isParsePending(err(503)) === false);
check('isParsePending ignores null', isParsePending(null) === false);

console.log(`purchaseDecisionMapping: ${passed}/${passed} cases passed`);
