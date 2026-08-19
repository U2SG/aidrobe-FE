// V3-020 — the §5.4 layer-5 boundary sentence, and where it came from.
//
// The client hardcodes a duplicate of a sentence the server also renders: the
// `should_i_buy.boundaryFallback` key mirrors the BE's `boundary_note` copy, so
// a decision that arrives without its server note still shows non-sizing
// language under a ready render (acceptance 2). A duplicate with nothing
// guarding it is a divergence waiting to happen — one side reworded, the other
// not, and the render silently disclaims something other than what the spec
// requires. The round-2 evaluator raised exactly that: the provenance check
// existed, but as a script under `.agent-artifacts/`, so it only ran when a
// builder remembered to run it. This file is that check, in the suite.
//
// It is the ONE home for the boundary-copy claim: the two locale pins moved
// here out of `previewFeedbackMapping.test.ts`, which keeps the §6.1 request,
// the state machine and the copy deny-list.
//
// Two tiers, because the two halves are not verifiable in the same places:
//
//   A. ALWAYS — the FE-side pins. Both locales against literals, both locales
//      non-vacuous (a sentence that disclaims nothing would make the copy
//      deny-list's boundary exemption vacuous too), and zh ≠ en. This is what
//      runs in FE CI, which has no BE checkout.
//   B. WHEN THE WORKSPACE IS PRESENT — the cross-repo half: FE == the BE's own
//      `boundary_note` in both locales, and the sentence verbatim in V3_SPEC.
//      The V3 workspace keeps both repos side by side and runs `npm test`
//      through `./init.sh smoke`, so tier B is live for every builder and
//      every evaluator. Where those paths do not exist it prints what it could
//      not check, by name — a skipped check never reports as a passed one.
//
// Run:  node scripts/boundaryCopyProvenance.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PREVIEW_BOUNDARY_FALLBACK_KEY } from '../src/api/previewFeedbackMapping.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';
import { enUS } from '../src/i18n/en-US.ts';

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const FE_ZH = zhCN[PREVIEW_BOUNDARY_FALLBACK_KEY];
const FE_EN = enUS[PREVIEW_BOUNDARY_FALLBACK_KEY];

// The words the sentence must keep naming. They are also the copy deny-list's
// terms (see previewFeedbackMapping.test.ts): every other preview string is
// forbidden from mentioning them, and this one is exempt *because* disclaiming
// them is its whole job. If it stopped naming them, the exemption would protect
// nothing and the deny-list would be passing on a technicality.
const ZH_MUST_NAME = ['尺码', '触感', '垂坠'];
const EN_MUST_NAME = [/\bsize\b/i, /\bfeel\b/i, /\bdrape\b/i];

console.log('A. the FE-side pins (always, incl. FE CI)');

check('the zh fallback is V3_SPEC §14\'s fixed sentence, verbatim', () => {
  assert.equal(FE_ZH, '用于判断整体感觉；实际尺码、触感和精确垂坠仍需参考商品信息。');
});

check('the en fallback mirrors the server\'s en-US boundary_note copy', () => {
  assert.equal(
    FE_EN,
    'This is about the overall look; actual size, feel and drape still come from the product details.',
  );
});

check('both locales name size, feel and drape — the deny-list exemption is not vacuous', () => {
  for (const term of ZH_MUST_NAME) assert.ok(FE_ZH.includes(term), `zh does not name ${term}`);
  for (const term of EN_MUST_NAME) assert.ok(term.test(FE_EN), `en does not match ${term}`);
});

check('zh and en are different sentences — no locale was filled in from the other', () => {
  assert.notEqual(FE_ZH, FE_EN);
});

console.log('B. the cross-repo half (workspace only)');

// The workspace layout this tier needs: <workspace>/{V3_SPEC.md,aidrobe-FE,aidrobe-BE}.
const WORKSPACE = new URL('../../', import.meta.url);
const SPEC_PATH = fileURLToPath(new URL('V3_SPEC.md', WORKSPACE));
const BE_RULES_PATH = fileURLToPath(
  new URL('aidrobe-BE/app/application/purchase/purchase_decision_rules.py', WORKSPACE),
);

/** `"boundary_note": "…"` or its parenthesized multi-line form, per locale
 *  block of `_TEMPLATES`. Keyed by the block's locale so a reordering of the
 *  dict cannot silently compare zh against en. */
function beBoundaryNotes(source: string): Record<string, string> {
  const found: Record<string, string> = {};
  const localeBlock = /^ {4}"([a-zA-Z-]+)": \{$/gm;
  const starts: Array<{ locale: string; at: number }> = [];
  for (const match of source.matchAll(localeBlock)) {
    starts.push({ locale: match[1], at: match.index ?? 0 });
  }
  for (let i = 0; i < starts.length; i += 1) {
    const slice = source.slice(starts[i].at, starts[i + 1]?.at ?? source.length);
    // Single-line value, or a parenthesized one wrapped onto the next line.
    const note = /"boundary_note":\s*(?:"([^"]*)"|\(\s*\n\s*"([^"]*)"\s*\n\s*\))/.exec(slice);
    if (note) found[starts[i].locale] = note[1] ?? note[2];
  }
  return found;
}

if (existsSync(SPEC_PATH) && existsSync(BE_RULES_PATH)) {
  const beNotes = beBoundaryNotes(readFileSync(BE_RULES_PATH, 'utf8'));

  check('the BE really does render a boundary_note in both locales', () => {
    assert.ok(beNotes['zh-CN'], 'no zh-CN boundary_note found in purchase_decision_rules.py');
    assert.ok(beNotes['en-US'], 'no en-US boundary_note found in purchase_decision_rules.py');
  });

  check('FE zh fallback == BE zh boundary_note — a missing note and a present one read alike', () => {
    assert.equal(FE_ZH, beNotes['zh-CN']);
  });

  check('FE en fallback == BE en boundary_note', () => {
    assert.equal(FE_EN, beNotes['en-US']);
  });

  check('the zh sentence appears verbatim as its own line in V3_SPEC.md', () => {
    const lines = readFileSync(SPEC_PATH, 'utf8').split('\n');
    const hits = lines
      .map((line, index) => (line.trim() === FE_ZH ? index + 1 : 0))
      .filter((n) => n > 0);
    assert.ok(hits.length > 0, 'the sentence is nowhere in V3_SPEC.md verbatim');
    console.log(`      V3_SPEC.md lines: ${hits.join(', ')}`);
  });
} else {
  // Not a failure — FE CI legitimately has no sibling BE checkout. But say
  // precisely which claims went unverified, so a green run is never read as
  // more coverage than it is.
  console.log('  ⊘ SKIPPED — no V3 workspace beside this repo, so these are NOT covered here:');
  console.log('      · FE zh/en fallback == BE purchase_decision_rules.py boundary_note zh/en');
  console.log('      · the zh sentence appears verbatim in V3_SPEC.md');
  console.log(`      (looked for ${SPEC_PATH} and ${BE_RULES_PATH})`);
  console.log('      Tier A above still pinned both locales against literals.');
}

console.log(`\nboundaryCopyProvenance: ${checks} checks passed`);
