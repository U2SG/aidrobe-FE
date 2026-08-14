// V3-014 — regression coverage for the avatar candidate sheet's contract
// mapping, its one-time gating and the copy the recorded consent version names.
// Run:  node scripts/avatarCandidatePrompt.test.ts   (Node >= 22 type-stripping)
//
// Everything asserted here is reachable without a simulator because the logic
// lives in RN-free modules; the sheet's rendered behavior is evidenced
// separately by the browser driver in .agent-artifacts/v3-014/.
import assert from 'node:assert/strict';

import {
  AVATAR_SOURCE_TYPES,
  AVATAR_STATUSES,
  buildConsentBody,
  isPromptableCandidate,
  toAvatarConsentErrorState,
  toAvatarProfile,
  toAvatarStatus,
  type ServerAvatarProfile,
} from '../src/api/avatarProfileMapping.ts';
import {
  AVATAR_CANDIDATE_POLL_ATTEMPTS,
  AVATAR_PROMPT_LEDGER_MAX,
  hasBeenPrompted,
  initialAvatarCandidatePromptState,
  nextPollDelayMs,
  recordPrompted,
} from '../src/state/avatarCandidatePrompt.ts';
import {
  AVATAR_CONSENT_COPY_KEYS,
  AVATAR_CONSENT_COPY_VERSION,
} from '../src/i18n/avatarConsentCopy.ts';
import { V3_AVATAR_SOURCES, V3_AVATAR_STATUSES } from '../src/utils/v3AnalyticsEvents.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';
import { enUS } from '../src/i18n/en-US.ts';

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

// --- The frozen §4 vocabularies ------------------------------------------------
console.log('§4 contract vocabularies');

check('avatar_status matches the analytics enum exactly', () => {
  // The API vocabulary and the event vocabulary are declared independently (one
  // is the wire contract, one is the analytics contract) — this is what stops
  // them drifting apart silently.
  assert.deepEqual([...AVATAR_STATUSES], [...V3_AVATAR_STATUSES]);
});

check('candidate source_type matches the analytics enum exactly', () => {
  assert.deepEqual([...AVATAR_SOURCE_TYPES], [...V3_AVATAR_SOURCES]);
});

// --- Version-skew rule (contract §3, frozen) -----------------------------------
console.log('§3 version-skew rule');

check('every known status maps to itself', () => {
  for (const status of AVATAR_STATUSES) assert.equal(toAvatarStatus(status), status);
});

check('an unknown status degrades to disabled, not to a usable state', () => {
  assert.equal(toAvatarStatus('hologram_ready'), 'disabled');
  assert.equal(toAvatarStatus(undefined), 'disabled');
  assert.equal(toAvatarStatus(null), 'disabled');
  assert.equal(toAvatarStatus(7), 'disabled');
});

const CANDIDATE_PROFILE: ServerAvatarProfile = {
  status: 'candidate',
  candidate: {
    source_asset_id: 'asset-1',
    source_type: 'ootd_photo',
    preview_url: 'https://example.test/signed/preview.jpg?sig=abc',
  },
  active_version: null,
  consent: null,
};

check('a candidate profile maps to a promptable candidate', () => {
  const profile = toAvatarProfile(CANDIDATE_PROFILE);
  assert.equal(profile.status, 'candidate');
  assert.equal(profile.candidate?.sourceAssetId, 'asset-1');
  assert.equal(profile.candidate?.sourceType, 'ootd_photo');
  assert.equal(isPromptableCandidate(profile), true);
});

check('no status other than `candidate` is promptable', () => {
  for (const status of AVATAR_STATUSES) {
    const profile = toAvatarProfile({ ...CANDIDATE_PROFILE, status });
    assert.equal(
      isPromptableCandidate(profile),
      status === 'candidate',
      `${status} promptable?`,
    );
  }
});

check('an unknown source_type blocks the prompt rather than emitting an invalid event', () => {
  const profile = toAvatarProfile({
    ...CANDIDATE_PROFILE,
    candidate: { source_asset_id: 'asset-1', source_type: 'mirror_selfie', preview_url: null },
  });
  // The candidate still maps (so a later build can use it) but this build will
  // not ask: `trackV3` throws in dev on a value outside the frozen enum.
  assert.equal(profile.candidate?.sourceType, null);
  assert.equal(isPromptableCandidate(profile), false);
});

check('a candidate with no durable id is dropped, not half-rendered', () => {
  const profile = toAvatarProfile({
    ...CANDIDATE_PROFILE,
    candidate: { source_asset_id: '', source_type: 'ootd_photo', preview_url: 'x' },
  });
  assert.equal(profile.candidate, null);
  assert.equal(isPromptableCandidate(profile), false);
});

check('a missing preview URL still yields a promptable candidate', () => {
  // The sheet renders without the picture; a signed URL that failed to mint is
  // not a reason to withhold a consent question.
  const profile = toAvatarProfile({
    ...CANDIDATE_PROFILE,
    candidate: { source_asset_id: 'asset-1', source_type: 'outfit_import' },
  });
  assert.equal(profile.candidate?.previewUrl, null);
  assert.equal(isPromptableCandidate(profile), true);
});

check('status=none is a normal profile, not an error shape', () => {
  const profile = toAvatarProfile({ status: 'none' });
  assert.equal(profile.status, 'none');
  assert.equal(profile.candidate, null);
  assert.equal(profile.consentVersion, null);
  assert.equal(profile.hasActiveVersion, false);
});

check('a recorded consent is surfaced with its version and timestamp', () => {
  const profile = toAvatarProfile({
    status: 'ready',
    consent: { version: 'v3-p0-test', consented_at: '2026-08-14T00:00:00Z' },
    active_version: { id: 'v1', created_at: '2026-08-14T00:00:00Z' },
  });
  assert.equal(profile.consentVersion, 'v3-p0-test');
  assert.equal(profile.consentedAt, '2026-08-14T00:00:00Z');
  assert.equal(profile.hasActiveVersion, true);
});

// --- §4.2 consent body shape ---------------------------------------------------
console.log('§4.2 consent request body');

check('accept carries the consent version', () => {
  assert.deepEqual(buildConsentBody(true, AVATAR_CONSENT_COPY_VERSION), {
    accept: true,
    consent_version: AVATAR_CONSENT_COPY_VERSION,
  });
});

check('decline omits the version entirely (the BE refuses it with 4001)', () => {
  const body = buildConsentBody(false, AVATAR_CONSENT_COPY_VERSION);
  assert.deepEqual(body, { accept: false });
  assert.equal('consent_version' in body, false);
});

// --- Consent error mapping -----------------------------------------------------
console.log('consent error states');

check('503 (flag off) is not retryable — a retry could never succeed', () => {
  assert.deepEqual(toAvatarConsentErrorState({ response: { status: 503 } }), {
    kind: 'unavailable',
    retryable: false,
  });
});

check('404 / 409 close the sheet instead of offering a dead retry', () => {
  for (const status of [404, 409, 400, 422, 401]) {
    assert.equal(
      toAvatarConsentErrorState({ response: { status } }).retryable,
      false,
      `status ${status}`,
    );
  }
});

check('429, 5xx and no-response are retryable', () => {
  for (const status of [429, 500, 502, 504]) {
    assert.equal(
      toAvatarConsentErrorState({ response: { status } }).retryable,
      true,
      `status ${status}`,
    );
  }
  assert.equal(toAvatarConsentErrorState(undefined).retryable, true);
  assert.equal(toAvatarConsentErrorState({}).retryable, true);
});

// --- §7.3 one prompt per candidate, forever ------------------------------------
console.log('§7.3 one-time prompting');

check('a fresh device has asked about nothing', () => {
  assert.equal(hasBeenPrompted(initialAvatarCandidatePromptState(), 'asset-1'), false);
});

check('showing a prompt records it, and it never re-arms', () => {
  let s = initialAvatarCandidatePromptState();
  s = recordPrompted(s, 'asset-1');
  assert.equal(hasBeenPrompted(s, 'asset-1'), true);
  // Re-recording is a no-op (identity preserved), so a repeat cannot grow the
  // ledger or reorder it into eviction range.
  assert.equal(recordPrompted(s, 'asset-1'), s);
  assert.equal(hasBeenPrompted(s, 'asset-2'), false, 'a different candidate is still askable');
});

check('the ledger is bounded and evicts oldest-first', () => {
  let s = initialAvatarCandidatePromptState();
  for (let i = 0; i < AVATAR_PROMPT_LEDGER_MAX + 5; i += 1) s = recordPrompted(s, `asset-${i}`);
  assert.equal(s.promptedAssetIds.length, AVATAR_PROMPT_LEDGER_MAX);
  assert.equal(hasBeenPrompted(s, 'asset-0'), false, 'oldest evicted');
  assert.equal(
    hasBeenPrompted(s, `asset-${AVATAR_PROMPT_LEDGER_MAX + 4}`),
    true,
    'newest retained',
  );
});

// --- The discovery window ------------------------------------------------------
console.log('discovery window');

check('the poll window is bounded and then closes for good', () => {
  for (let attempt = 0; attempt < AVATAR_CANDIDATE_POLL_ATTEMPTS; attempt += 1) {
    const delay = nextPollDelayMs(attempt);
    assert.equal(typeof delay, 'number');
    assert.ok((delay as number) > 0, 'a zero delay would busy-loop the client');
  }
  assert.equal(nextPollDelayMs(AVATAR_CANDIDATE_POLL_ATTEMPTS), null);
  assert.equal(nextPollDelayMs(AVATAR_CANDIDATE_POLL_ATTEMPTS + 50), null);
});

check('the whole window stays short enough to still read as part of the flow', () => {
  let total = 0;
  for (let attempt = 0; ; attempt += 1) {
    const delay = nextPollDelayMs(attempt);
    if (delay == null) break;
    total += delay;
  }
  assert.ok(total <= 20_000, `discovery window ${total}ms is too long to belong to the flow`);
});

// --- The consent copy the recorded version stands for --------------------------
console.log('consent copy + version');

check('the version is a non-empty string within the BE column bound', () => {
  assert.equal(typeof AVATAR_CONSENT_COPY_VERSION, 'string');
  assert.ok(AVATAR_CONSENT_COPY_VERSION.length > 0);
  assert.ok(
    AVATAR_CONSENT_COPY_VERSION.length <= 64,
    'avatar_source_assets.consent_version is varchar(64); the BE refuses longer with 4001',
  );
});

check('the version still declares itself unapproved (open human gate)', () => {
  // V3_SPEC §4.3 makes the production consent copy a human approval. If this
  // assertion is ever removed, it must be because a human approved the copy —
  // not because it became inconvenient.
  assert.match(AVATAR_CONSENT_COPY_VERSION, /unapproved/);
});

check('every key the version names exists in BOTH catalogues and is non-empty', () => {
  for (const key of AVATAR_CONSENT_COPY_KEYS) {
    const zh = (zhCN as Record<string, string>)[key];
    const en = (enUS as Record<string, string>)[key];
    assert.ok(zh && zh.length > 0, `zh-CN missing ${key}`);
    assert.ok(en && en.length > 0, `en-US missing ${key}`);
  }
});

check('the copy covers all three §15 authorization clauses', () => {
  // purpose / third-party model / replace-and-delete control, each as its own
  // key so "the copy explains X" is checkable rather than asserted.
  for (const key of ['avatarConsent.purpose', 'avatarConsent.thirdParty', 'avatarConsent.control']) {
    assert.ok(
      (AVATAR_CONSENT_COPY_KEYS as readonly string[]).includes(key),
      `${key} must be part of what the consent version names`,
    );
  }
  assert.match(zhCN['avatarConsent.thirdParty'], /第三方/);
  assert.match(enUS['avatarConsent.thirdParty'], /third-party/i);
  assert.match(zhCN['avatarConsent.control'], /删除/);
  assert.match(enUS['avatarConsent.control'], /delete/i);
});

check('the sheet offers exactly one accept and one decline action', () => {
  // Acceptance 4's "no repeated prompting" has a sibling requirement: declining
  // must be a first-class action, not a scrim tap. Both labels are copy keys.
  assert.ok((AVATAR_CONSENT_COPY_KEYS as readonly string[]).includes('avatarConsent.accept'));
  assert.ok((AVATAR_CONSENT_COPY_KEYS as readonly string[]).includes('avatarConsent.decline'));
});

check('no forbidden §22 / §9.3 framing reaches the consent copy', () => {
  // check-copy-denylist.ts enforces this across the whole catalogue; asserted
  // here too so the feature's own test fails loudly and names the rule.
  const banned = ['创建数字人', '开始建模', '3D 分身', '数字分身', '元宇宙衣橱', 'AI 虚拟试衣'];
  for (const key of AVATAR_CONSENT_COPY_KEYS) {
    const text = `${(zhCN as Record<string, string>)[key]} ${(enUS as Record<string, string>)[key]}`;
    for (const word of banned) {
      assert.equal(text.includes(word), false, `${key} uses banned framing "${word}"`);
    }
  }
});

check('no body/size/age claim reaches the consent copy (§15 prohibitions)', () => {
  const banned = ['显瘦', '遮肉', '减龄', '身材', '尺码', '三围', 'slimming', 'body shape'];
  for (const key of AVATAR_CONSENT_COPY_KEYS) {
    const text = `${(zhCN as Record<string, string>)[key]} ${(enUS as Record<string, string>)[key]}`;
    for (const word of banned) {
      assert.equal(
        text.toLowerCase().includes(word.toLowerCase()),
        false,
        `${key} makes a body claim via "${word}"`,
      );
    }
  }
});

console.log(`\navatarCandidatePrompt: ${checks}/${checks} passed`);
