// V3-020 — regression coverage for the honest ready presentation: the frozen
// §6.1 feedback request (acceptance 3 + the feature's "feedback request
// assertion" evidence, static half — the live wire half is the browser driver
// in .agent-artifacts/v3-020/), the single-shot state machine that protects
// the looks-like-me denominator, the unconditional §5.4 layer-5 boundary line
// (acceptance 2), and the copy deny-list that keeps every preview string from
// claiming exact fit, size, fabric feel or drape.
// Run:  node scripts/previewFeedbackMapping.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FEEDBACK_OPEN,
  PREVIEW_BOUNDARY_FALLBACK_KEY,
  PREVIEW_FEEDBACK_VERDICTS,
  previewFeedbackAllowed,
  previewFeedbackBody,
  previewFeedbackLabelKey,
  previewFeedbackPath,
  previewFeedbackSent,
} from '../src/api/previewFeedbackMapping.ts';
import { V3_FEEDBACK_VERDICTS, V3_EVENT_SPECS } from '../src/utils/v3AnalyticsEvents.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';
import { enUS } from '../src/i18n/en-US.ts';

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const SCREEN_SOURCE = readFileSync(
  new URL('../src/screens/discover/ShouldIBuyScreen.tsx', import.meta.url),
  'utf8',
);
const CONTRACT_SOURCE = readFileSync(
  new URL('../docs/v3-p0-contract.md', import.meta.url),
  'utf8',
);

console.log('the frozen §6.1 feedback request');

check('the three verdicts are the acceptance vocabulary, verbatim', () => {
  assert.deepEqual(
    [...PREVIEW_FEEDBACK_VERDICTS],
    ['looks_like_me', 'not_like_me', 'garment_wrong'],
  );
});

check('the API vocabulary matches the analytics vocabulary — one list, two channels', () => {
  // The mapping module declares its own copy to stay Node-loadable; this pin
  // is what stops the two channels from being edited apart.
  assert.deepEqual([...PREVIEW_FEEDBACK_VERDICTS], [...V3_FEEDBACK_VERDICTS]);
  assert.deepEqual(V3_EVENT_SPECS.v3_preview_feedback.fields.verdict.values, V3_FEEDBACK_VERDICTS);
});

check('every verdict appears in the contract document feedback body line', () => {
  const feedbackLine = CONTRACT_SOURCE.split('\n').find((l) => l.includes('Feedback body'));
  assert.ok(feedbackLine, 'contract §6.1 must contain a "Feedback body" line');
  for (const verdict of PREVIEW_FEEDBACK_VERDICTS) {
    assert.ok(feedbackLine.includes(verdict), `${verdict} missing from the contract line`);
  }
});

check('the path is §6.1\'s, keyed by the asset', () => {
  assert.equal(previewFeedbackPath('a-1'), '/v1/outfit-visual-assets/a-1/feedback');
  assert.ok(CONTRACT_SOURCE.includes('POST /v1/outfit-visual-assets/{asset_id}/feedback'));
});

check('the body is exactly {verdict} — aspects omitted, nothing smuggled', () => {
  const body = previewFeedbackBody('garment_wrong');
  assert.deepEqual(body, { verdict: 'garment_wrong' });
  assert.deepEqual(Object.keys(body), ['verdict']);
});

console.log('single-shot state machine');

check('open allows exactly one answer; sent blocks every further one', () => {
  assert.equal(previewFeedbackAllowed(FEEDBACK_OPEN), true);
  for (const verdict of PREVIEW_FEEDBACK_VERDICTS) {
    const sent = previewFeedbackSent(verdict);
    assert.deepEqual(sent, { kind: 'sent', verdict });
    assert.equal(previewFeedbackAllowed(sent), false);
  }
});

console.log('chip copy');

check('every verdict has a distinct label key present in both catalogues', () => {
  const keys = PREVIEW_FEEDBACK_VERDICTS.map(previewFeedbackLabelKey);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of keys) {
    assert.ok(zhCN[key], `zh-CN missing ${key}`);
    assert.ok(enUS[key], `en-US missing ${key}`);
  }
});

console.log('the boundary line (acceptance 2)');

// The two locale pins and the FE==BE==V3_SPEC provenance chain live in
// scripts/boundaryCopyProvenance.test.ts — one file owns the sentence itself.
// What stays here is how the card USES it, and the deny-list it is exempt from.

check('the boundary line renders unconditionally — null server note falls back, never disappears', () => {
  assert.ok(SCREEN_SOURCE.includes('card.boundaryNote ?? t.t(PREVIEW_BOUNDARY_FALLBACK_KEY)'));
  assert.ok(!SCREEN_SOURCE.includes('card.boundaryNote ? ('));
});

// The only strings allowed to mention size / fit / fabric feel / drape are the
// two boundary sentences, whose whole job is to DISCLAIM them (the BE's
// BANNED_CLAIM_TERMS + boundary_note exemption, mirrored client-side). Word
// boundaries on the English side so 'outfit' does not trip 'fit'.
const ZH_CLAIM_TERMS = ['合身', '尺码', '面料', '垂坠', '触感', '显瘦'];
const EN_CLAIM_TERMS = [/\bfits?\b/i, /\bsize\b/i, /\bfabric\b/i, /\bdrapes?\b/i, /\bfeels?\b/i];

check('no preview copy claims fit, size, fabric feel or drape (zh)', () => {
  for (const [key, value] of Object.entries(zhCN)) {
    if (!key.startsWith('should_i_buy.preview.')) continue;
    for (const term of ZH_CLAIM_TERMS) {
      assert.ok(!value.includes(term), `${key} mentions "${term}"`);
    }
  }
});

check('no preview copy claims fit, size, fabric feel or drape (en)', () => {
  for (const [key, value] of Object.entries(enUS)) {
    if (!key.startsWith('should_i_buy.preview.')) continue;
    for (const term of EN_CLAIM_TERMS) {
      assert.ok(!term.test(value), `${key} matches ${term}`);
    }
  }
});

check('…and the exemption is not vacuous: the boundary line really names them', () => {
  const zh = zhCN[PREVIEW_BOUNDARY_FALLBACK_KEY];
  for (const term of ['尺码', '触感', '垂坠']) assert.ok(zh.includes(term));
  const en = enUS[PREVIEW_BOUNDARY_FALLBACK_KEY];
  for (const term of [/\bsize\b/i, /\bfeel\b/i, /\bdrape\b/i]) assert.ok(term.test(en));
});

console.log('the ready caption (acceptance 1)');

check('the caption names both halves: the candidate AND the user\'s own items', () => {
  const zh = zhCN['should_i_buy.preview.readyCaption'];
  assert.ok(zh.includes('候选') && zh.includes('已有'), zh);
  const en = enUS['should_i_buy.preview.readyCaption'];
  assert.ok(/candidate/i.test(en) && /already own/i.test(en), en);
});

console.log('screen wiring (acceptance 3 + 4)');

check('one tap fans out to both channels: the FE-owned event and the §6.1 POST', () => {
  assert.ok(SCREEN_SOURCE.includes("emit('v3_preview_feedback', { verdict })"));
  assert.ok(SCREEN_SOURCE.includes('sendVisualPreviewFeedback(assetId, verdict)'));
});

check('the chips come from the frozen list — no fourth option can be hand-added', () => {
  assert.ok(SCREEN_SOURCE.includes('PREVIEW_FEEDBACK_VERDICTS.map('));
  // No literal verdict strings in the screen: the vocabulary lives in ONE place.
  assert.ok(!SCREEN_SOURCE.includes("'looks_like_me'"));
});

check('the single-shot gate is the mapping\'s, not a re-derived one', () => {
  assert.ok(SCREEN_SOURCE.includes('previewFeedbackAllowed(state)'));
});

check('the ready render keeps the decision on the page — the preview stays one layer inside the card', () => {
  // The ready branch returns a slot-sized block, not a screen: judgment,
  // reasons, boundary and actions are siblings rendered by the card around it.
  const readyBranch = SCREEN_SOURCE.slice(
    SCREEN_SOURCE.indexOf("if (phase.kind === 'ready')"),
    SCREEN_SOURCE.indexOf("if (phase.kind === 'no_result')"),
  );
  assert.ok(readyBranch.includes('PreviewFeedbackRow'));
  assert.ok(readyBranch.includes('should_i_buy.preview.readyCaption'));
  // And the card still renders every decision layer after the preview slot.
  for (const layer of ['<Judgment', '<ClosetComparison', 'card.boundaryNote', '<NextActions']) {
    assert.ok(SCREEN_SOURCE.includes(layer), `${layer} missing from the card`);
  }
});

console.log(`\npreviewFeedbackMapping: ${checks} checks passed`);
