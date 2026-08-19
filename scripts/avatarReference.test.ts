// V3-021 — regression coverage for the Profile 形象参考 controls: which of
// V3_SPEC §15's four controls a profile may offer, what each one calls, and the
// one property the whole feature turns on — that a delete or a revoke changes
// what the app offers IMMEDIATELY, without waiting for a second round trip.
// Run:  node scripts/avatarReference.test.ts   (Node >= 22 type-stripping)
//
// The rules live in RN-free modules, so they are executed here rather than
// argued about. What a user actually SEES is evidenced separately by the browser
// driver in .agent-artifacts/v3-021/ — this file cannot show a screenshot, and a
// screenshot cannot show a matrix.
//
// Two things are asserted from SOURCE TEXT rather than by execution, and each
// says why at the assertion: the screen and `avatarProfile.ts` both import the
// axios client (and through it expo-constants), which cannot load in bare Node.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  AVATAR_STATUSES,
  avatarReferenceControls,
  avatarSetupStart,
  toAvatarDeletion,
  toAvatarProfile,
  type AvatarProfile,
  type ServerAvatarProfile,
} from '../src/api/avatarProfileMapping.ts';
import {
  AVATAR_REFERENCE_CONFIRMS,
  controlAsked,
  controlCancelled,
  controlConfirmed,
  controlFailed,
  controlsEnabled,
  deletionSettled,
  initialAvatarReferenceState,
  profileLoaded,
  profileReadFailed,
  referenceRetryTarget,
  referenceStatusKeySuffix,
  replacementSettled,
} from '../src/screens/avatar/avatarReference.ts';
import { zhCN } from '../src/i18n/zh-CN.ts';
import { enUS } from '../src/i18n/en-US.ts';

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const SCREEN = read('src/screens/avatar/AvatarReferenceScreen.tsx');
const API = read('src/api/avatarProfile.ts');
const NAV_TYPES = read('src/types/navigation.ts');
const NAVIGATOR = read('src/core/navigation/SettingsNavigator.tsx');
const PROFILE_V2 = read('src/screens/profile-v2/ProfileV2Screen.tsx');
const SETTINGS_V1 = read('src/screens/settings/SettingsScreen.tsx');
const SHOULD_I_BUY = read('src/screens/discover/ShouldIBuyScreen.tsx');

const server = (over: Partial<ServerAvatarProfile> = {}): ServerAvatarProfile => ({
  status: 'none',
  active_version: null,
  candidate: null,
  consent: null,
  ...over,
});

const READY_VERSION = {
  id: 'version-1',
  created_at: '2026-08-18T10:00:00Z',
  canonical_front_url: 'https://signed.example/front.png?sig=abc',
};

const ready = (over: Partial<ServerAvatarProfile> = {}): AvatarProfile =>
  toAvatarProfile(
    server({
      status: 'ready',
      active_version: READY_VERSION,
      consent: { version: 'v3-p0-2026-08-14-unapproved', consented_at: '2026-08-17T09:00:00Z' },
      ...over,
    }),
  );

const OFFERED_CANDIDATE = {
  source_asset_id: 'asset-2',
  source_type: 'user_upload',
  preview_url: 'https://signed.example/reshoot.jpg?sig=def',
};

// --- Acceptance 1: Profile offers view, replace, disable and delete ------------
console.log('avatarReferenceControls (the full status matrix)');

check('the live states offer all four controls, and the reference is viewable', () => {
  for (const status of ['ready', 'refresh_recommended']) {
    const controls = avatarReferenceControls(ready({ status }));
    assert.equal(controls.showsReference, true, status);
    assert.equal(controls.replace, 'new_photo', status);
    assert.equal(controls.stopGeneration, true, status);
    assert.equal(controls.deleteEverything, true, status);
    assert.equal(controls.setUpAgain, false, status);
  }
});

check('material already on offer turns replace into "use that photo"', () => {
  // V3-021's widened `candidate` block: a `ready` profile can carry qualified
  // material, which is what makes replace-from-a-NEW-photo reachable at all. The
  // variant exists so the screen does not send the user to the picker for a photo
  // the server is already holding.
  const controls = avatarReferenceControls(ready({ candidate: OFFERED_CANDIDATE }));
  assert.equal(controls.replace, 'consent_offered_photo');
  assert.equal(controls.showsReference, true, 'the live version is still shown while it waits');
});

check('replace is never offered without a version to swap out', () => {
  // `PrepareAvatar._assert_mode_allowed` refuses REPLACE with no active version
  // (`WRONG_PROFILE_STATE`), so offering it anywhere else is a control that fails
  // after the tap.
  for (const status of ['none', 'candidate', 'preparing', 'disabled']) {
    assert.equal(avatarReferenceControls(toAvatarProfile(server({ status }))).replace, null, status);
  }
});

check('`none` offers nothing at all — acquisition stays contextual', () => {
  const controls = avatarReferenceControls(toAvatarProfile(server()));
  assert.deepEqual(controls, {
    showsReference: false,
    replace: null,
    stopGeneration: false,
    deleteEverything: false,
    setUpAgain: false,
  });
});

check('a revoked profile offers delete and set-up-again, and nothing to stop', () => {
  // Delete stays available on purpose: it is the only way to remove the previews
  // a previous 停止用于生成 deliberately kept, and `delete_avatar` is idempotent.
  const controls = avatarReferenceControls(toAvatarProfile(server({ status: 'disabled' })));
  assert.equal(controls.deleteEverything, true);
  assert.equal(controls.setUpAgain, true);
  assert.equal(controls.stopGeneration, false, 'there is no generation left to stop');
  assert.equal(controls.replace, null);
});

check('a status this build cannot read offers ONLY the delete', () => {
  // The frozen §3 skew rule collapses an unknown status to `disabled`, which
  // V3-021 made actionable — so without `statusIsKnown` an unrecognized status
  // would inherit an invitation to upload a person photo, which is precisely what
  // the skew rule exists to prevent. Deletion is the deliberate exception: its
  // worst case is that there was nothing left to delete, and hiding it would
  // strand a user's photos behind a string this build happens not to know.
  const unknown = toAvatarProfile(server({ status: 'hologram_ready' }));
  assert.equal(unknown.status, 'disabled', 'the frozen collapse still happens');
  assert.equal(unknown.statusIsKnown, false, 'and is no longer indistinguishable from it');
  const controls = avatarReferenceControls(unknown);
  assert.deepEqual(controls, {
    showsReference: false,
    replace: null,
    stopGeneration: false,
    deleteEverything: true,
    setUpAgain: false,
  });
  assert.equal(avatarSetupStart(unknown), 'blocked', 'and it cannot reach the picker');
});

check('every status in the frozen enum is covered by the matrix', () => {
  // So a seventh status cannot be added upstream and quietly inherit whatever
  // this file happened to test.
  assert.deepEqual(
    [...AVATAR_STATUSES],
    ['none', 'candidate', 'preparing', 'ready', 'refresh_recommended', 'disabled'],
  );
  for (const status of AVATAR_STATUSES) {
    const controls = avatarReferenceControls(toAvatarProfile(server({ status })));
    assert.equal(typeof controls.deleteEverything, 'boolean', status);
  }
});

check('the reference is only shown when there is a URL to show it with', () => {
  // `resolve_render_url` swallows a signing failure and returns null, so
  // `hasActiveVersion` and "renderable" are not the same fact. An empty frame
  // would read as loading.
  const unsigned = ready({
    active_version: { ...READY_VERSION, canonical_front_url: null },
  });
  assert.equal(unsigned.hasActiveVersion, true);
  assert.equal(avatarReferenceControls(unsigned).showsReference, false);
  assert.equal(
    avatarReferenceControls(unsigned).stopGeneration,
    true,
    'a reference that cannot be rendered can still be revoked',
  );
});

// --- The two destructive controls are the two `purge_derived` values -----------
console.log('the §15 control → API mapping');

check('stop sends purge_derived=false and delete sends purge_derived=true', () => {
  // Source-text, because `avatarProfile.ts` imports the axios client. Both
  // literals are pinned: a single flipped boolean here is the difference between
  // "your previews are kept" and "your previews are gone", said by the copy and
  // then not done.
  assert.match(API, /purge_derived=\$\{purgeDerived \? 'true' : 'false'\}/);
  assert.match(SCREEN, /deleteAvatarProfile\(control === 'delete'\)/);
  assert.equal(
    (SCREEN.match(/deleteAvatarProfile\(/g) ?? []).length,
    1,
    'one call site, so the two controls cannot diverge in how they delete',
  );
});

check('the deletion response is read, not assumed', () => {
  const deletion = toAvatarDeletion({
    status: 'disabled',
    purge_derived: true,
    scheduled_object_count: 3,
    purge_job_id: 'job-1',
  });
  assert.deepEqual(deletion, { status: 'disabled', purgedDerived: true });
});

check('an unknown deletion status degrades to disabled, like every other status', () => {
  const deletion = toAvatarDeletion({
    status: 'wiped',
    purge_derived: false,
    scheduled_object_count: 0,
  });
  assert.equal(deletion.status, 'disabled');
  assert.equal(deletion.purgedDerived, false);
});

check('the deletion mapping carries no object count and no job id', () => {
  // Neither is a promise this surface can keep: the count varies with how many
  // canonical renders a version happened to have, and a job id has no client
  // meaning. §15 promises WHAT is removed, not how much.
  const deletion = toAvatarDeletion({
    status: 'disabled',
    purge_derived: true,
    scheduled_object_count: 9,
    purge_job_id: 'job-2',
  });
  assert.deepEqual(Object.keys(deletion).sort(), ['purgedDerived', 'status']);
});

// --- Acceptance 2: availability changes IMMEDIATELY ----------------------------
console.log('acceptance 2 — the state after a stop or a delete');

const shown = profileLoaded(initialAvatarReferenceState(), ready());

check('the screen opens on a read, and the read is what populates it', () => {
  assert.equal(initialAvatarReferenceState().step, 'loading');
  assert.equal(initialAvatarReferenceState().profile, null);
  assert.equal(shown.step, 'shown');
  assert.equal(shown.profile?.status, 'ready');
  assert.equal(controlsEnabled(shown), true);
});

for (const [label, purged, outcome] of [
  ['stop', false, 'stopped'],
  ['delete', true, 'deleted'],
] as const) {
  check(`${label} leaves NOTHING available, without a second round trip`, () => {
    const settled = deletionSettled(shown, { status: 'disabled', purgedDerived: purged });
    assert.equal(settled.step, 'shown', 'the screen is usable again, not stuck in flight');
    assert.equal(settled.outcome, outcome);
    assert.equal(settled.profile?.status, 'disabled');
    assert.equal(settled.profile?.activeVersion, null);
    assert.equal(settled.profile?.hasActiveVersion, false);
    assert.equal(settled.profile?.candidate, null);
    const after = avatarReferenceControls(settled.profile!);
    assert.equal(after.showsReference, false, 'the reference is gone from the screen at once');
    assert.equal(after.replace, null);
    assert.equal(after.stopGeneration, false);
    assert.equal(after.setUpAgain, true, 'and the way back is offered');
  });
}

check('a fresh read clears the outcome line — it reports the LAST action, not any', () => {
  // Otherwise the report survived the focus re-read: leave for 重新设置, come
  // back, and the screen showed 「已停止用于生成」 above a profile that had since
  // moved to `preparing`. The deletion deliberately does NOT clear it (that is
  // what makes acceptance 2 immediate), so `profileLoaded` is the only place it
  // can go.
  const settled = deletionSettled(shown, { status: 'disabled', purgedDerived: false });
  assert.equal(settled.outcome, 'stopped');
  const reread = profileLoaded(settled, toAvatarProfile(server({ status: 'preparing' })));
  assert.equal(reread.outcome, null);
  assert.equal(reread.profile?.status, 'preparing');
});

check('the screen fires its request BESIDE the state update, never inside it', () => {
  // A `setState` updater must be pure — React may call it more than once per
  // dispatch (StrictMode does, in development) — and a side effect in there would
  // send two DELETEs for one tap. This app mounts no StrictMode today, which is
  // exactly why the shape has to be right rather than incidentally safe.
  assert.ok(
    !/setState\(\(current\) => \{[^}]*runControl/s.test(SCREEN),
    'runControl must not be called from inside a setState updater',
  );
  assert.match(SCREEN, /setState\(\(current\) => controlAsked\(current, control\)\);\s+if \(!AVATAR_REFERENCE_CONFIRMS/);
});

check('the consent record survives a deletion — it is the audit trail', () => {
  // Contract §4.3: the material goes, the record of what the user agreed to
  // stays. It names no object and carries no URL.
  const settled = deletionSettled(shown, { status: 'disabled', purgedDerived: true });
  assert.equal(settled.profile?.consentVersion, 'v3-p0-2026-08-14-unapproved');
  assert.equal(settled.profile?.consentedAt, '2026-08-17T09:00:00Z');
});

check('no signed URL survives a deletion anywhere in the state', () => {
  // Acceptance 3's client half. The BE half — that no read path can still NAME a
  // deleted object — is `test_neither_delete_branch_leaves_a_signable_avatar_url`.
  const settled = deletionSettled(profileLoaded(shown, ready({ candidate: OFFERED_CANDIDATE })), {
    status: 'disabled',
    purgedDerived: false,
  });
  const serialized = JSON.stringify(settled);
  assert.ok(!serialized.includes('signed.example'), serialized);
  assert.ok(!serialized.includes('http'), serialized);
});

check('the screen re-reads the profile on every focus', () => {
  // Source-text: the Profile tab is persistent, so a screen that only read on
  // mount would show a reference the user changed elsewhere. Paired with the
  // derive-on-delete rule above, not a substitute for it.
  assert.match(SCREEN, /useFocusEffect\(/);
  assert.match(SCREEN, /void read\(\)/);
});

check('the decision card re-probes on focus, so its entry cannot outlive a delete', () => {
  // The other surface that consumes avatar availability, in a different
  // persistent tab. `probedRef` and not the state value: taking a dependency on
  // the state would run the focus effect's CLEANUP mid-visit, which is the defect
  // V3-015 shipped and had to write a probe to find.
  assert.match(SHOULD_I_BUY, /probedRef/);
  assert.match(SHOULD_I_BUY, /if \(handedOffRef\.current \|\| probedRef\.current\) void probeAvatar\(\)/);
});

// --- The control machine ------------------------------------------------------
console.log('confirmation, work, failure, retry');

check('both destructive controls confirm first; the other two do not', () => {
  assert.deepEqual([...AVATAR_REFERENCE_CONFIRMS], ['stop', 'delete']);
  for (const control of ['stop', 'delete'] as const) {
    const asked = controlAsked(shown, control);
    assert.equal(asked.step, 'confirming', control);
    assert.equal(asked.pending, control);
    assert.equal(controlsEnabled(asked), false, 'the other controls go inert while it asks');
  }
  for (const control of ['replace', 'set_up_again'] as const) {
    // A failed replacement keeps the live version (§4.2), and set-up-again opens a
    // screen that asks for consent — a confirmation there is a dialog in front of
    // a dialog.
    assert.equal(controlAsked(shown, control).step, 'working', control);
  }
});

check('cancelling a confirmation returns to exactly the screen before it', () => {
  const cancelled = controlCancelled(controlAsked(shown, 'delete'));
  assert.deepEqual(cancelled, shown);
});

check('a confirmed control works, and the controls stay inert while it does', () => {
  const working = controlConfirmed(controlAsked(shown, 'stop'));
  assert.equal(working.step, 'working');
  assert.equal(working.pending, 'stop');
  assert.equal(controlsEnabled(working), false);
});

check('a replacement reports itself as preparing and keeps the live version', () => {
  const settled = replacementSettled(controlAsked(shown, 'replace'), {
    status: 'ready',
    created: true,
  });
  assert.equal(settled.outcome, 'replacing');
  assert.equal(settled.profile?.status, 'ready');
  assert.equal(settled.profile?.activeVersion?.id, 'version-1');
  assert.equal(avatarReferenceControls(settled.profile!).showsReference, true);
});

check('a swallowed duplicate replacement still reports preparing, never failure', () => {
  // `created=false` means an identical replacement was already in flight. Telling
  // the user it failed would invite them to pay for it twice.
  const settled = replacementSettled(controlAsked(shown, 'replace'), {
    status: 'ready',
    created: false,
  });
  assert.equal(settled.outcome, 'replacing');
  assert.equal(settled.problem, null);
});

check('a transient failure keeps the profile on screen and offers the same control', () => {
  const failed = controlFailed(controlConfirmed(controlAsked(shown, 'delete')), {
    response: { status: 503 - 3 }, // 500
  });
  assert.equal(failed.step, 'problem');
  assert.equal(failed.problem, 'action_failed');
  assert.equal(failed.profile?.status, 'ready', 'the failure was about the action, not the state');
  assert.equal(referenceRetryTarget(failed), 'delete');
});

check('no response at all is retryable — that is what retry exists for', () => {
  const failed = controlFailed(controlConfirmed(controlAsked(shown, 'stop')), null);
  assert.equal(failed.problem, 'action_failed');
  assert.equal(referenceRetryTarget(failed), 'stop');
});

check('503 is the flag going off, not a fault, and is checked before the 5xx branch', () => {
  const failed = controlFailed(controlConfirmed(controlAsked(shown, 'delete')), {
    response: { status: 503 },
  });
  assert.equal(failed.problem, 'unavailable');
  assert.equal(referenceRetryTarget(failed), null, 'a retry here can never succeed');
  assert.equal(failed.pending, null);
});

check('404 has nothing to act on, so it offers no retry either', () => {
  const failed = controlFailed(controlConfirmed(controlAsked(shown, 'delete')), {
    response: { status: 404 },
  });
  assert.equal(failed.problem, 'unavailable');
  assert.equal(referenceRetryTarget(failed), null);
});

check('429 is retryable', () => {
  const failed = controlFailed(controlConfirmed(controlAsked(shown, 'stop')), {
    response: { status: 429 },
  });
  assert.equal(failed.problem, 'action_failed');
});

check('a failed opening read offers a retry; a flag-off one says so instead', () => {
  const transient = profileReadFailed(initialAvatarReferenceState(), { response: { status: 500 } });
  assert.equal(transient.problem, 'read_failed');
  assert.equal(referenceRetryTarget(transient), 'read');
  const off = profileReadFailed(initialAvatarReferenceState(), { response: { status: 503 } });
  assert.equal(off.problem, 'unavailable');
  assert.equal(referenceRetryTarget(off), null);
});

check('the status line comes from the frozen enum, never from copy in a module', () => {
  assert.equal(referenceStatusKeySuffix(null), 'none');
  for (const status of AVATAR_STATUSES) {
    assert.equal(referenceStatusKeySuffix(toAvatarProfile(server({ status }))), status);
  }
});

// --- Acceptance 4: a settings surface, not a tab and not an identity page ------
console.log('acceptance 4 — where this screen lives');

check('the route is in the Settings stack and in no tab list', () => {
  assert.match(NAV_TYPES, /AvatarReference: undefined;/);
  const tabLists = NAV_TYPES.slice(NAV_TYPES.indexOf('MainTabsParamList'));
  assert.ok(
    !/AvatarReference/.test(tabLists),
    'a tab entry would break the frozen "no new top-level tab" exclusion',
  );
});

check('it is mounted outside the V2 conditional, so BOTH shells can reach it', () => {
  // `ENABLE_MVP_V2_UI` is off by default, so a route mounted only under it would
  // be unreachable in the shipped build.
  const mount = NAVIGATOR.indexOf('name="AvatarReference"');
  const v2Gate = NAVIGATOR.indexOf('{enableMvpV2Ui ? (');
  assert.ok(mount > 0 && v2Gate > 0);
  assert.ok(mount < v2Gate, 'AvatarReference must be mounted before the V2-only block');
});

check('both Profile surfaces carry the entry, and both gate it on the flag', () => {
  for (const [name, source] of [
    ['ProfileV2Screen', PROFILE_V2],
    ['SettingsScreen', SETTINGS_V1],
  ] as const) {
    assert.match(source, /enableV3Avatar \? \(/, name);
    assert.match(source, /navigate\('AvatarReference'\)/, name);
    assert.match(source, /avatarReference\.entry/, name);
  }
});

check('the entry sits in the privacy section of both surfaces', () => {
  // §15 puts these controls with the rest of the data controls, not beside a
  // profile photo where they would read as identity settings.
  const v2 = PROFILE_V2.indexOf("t('profile.section.privacy')");
  assert.ok(v2 > 0 && PROFILE_V2.indexOf('avatarReference.entry') > v2);
  const v1 = SETTINGS_V1.indexOf("t('settings.section.privacy')");
  assert.ok(v1 > 0 && SETTINGS_V1.indexOf('avatarReference.entry') > v1);
});

check('the screen renders no progress, streak, count or completeness of any kind', () => {
  // The frozen exclusion is "Avatar identity homepage" and "generation-count
  // gamification". Nothing on this surface may count anything.
  for (const word of ['streak', 'progress', 'completeness', 'scheduled_object_count', 'level']) {
    assert.ok(!SCREEN.includes(word), `${word} must not appear on a data-control surface`);
  }
});

// --- Copy: it exists, in both locales, and states what it does ----------------
console.log('the §15 copy');

const KEYS = Object.keys(zhCN).filter((key) => key.startsWith('avatarReference.'));

check('every avatarReference key exists in both catalogues and is non-empty', () => {
  assert.ok(KEYS.length >= 25, `expected the full §15 copy set, found ${KEYS.length}`);
  for (const key of KEYS) {
    const zh = (zhCN as Record<string, string>)[key];
    const en = (enUS as Record<string, string>)[key];
    assert.ok(zh && zh.trim().length > 0, key);
    assert.ok(en && en.trim().length > 0, `${key} is missing from en-US`);
  }
});

check('every status in the frozen enum has a status line in both locales', () => {
  for (const status of AVATAR_STATUSES) {
    const key = `avatarReference.status.${status}`;
    assert.ok((zhCN as Record<string, string>)[key], key);
    assert.ok((enUS as Record<string, string>)[key], `${key} (en-US)`);
  }
});

check('the two §15 authorization clauses are stated on this surface', () => {
  // What it is used for, and that a third-party model processes it. Deliberately
  // its own keys rather than `avatarConsent.*`: those define what a stored
  // consent_version stands for, and reusing them would widen the meaning of every
  // version already recorded.
  assert.match(SCREEN, /t\('avatarReference\.purpose'\)/);
  assert.match(SCREEN, /t\('avatarReference\.thirdParty'\)/);
  // Rendering, not mentioning: the comment above the block names the consent keys
  // in order to explain why it does not use them.
  assert.ok(!/t\('avatarConsent\./.test(SCREEN), 'the consent version keys stay out of here');
});

check('the stop confirmation says the reference goes and the previews stay', () => {
  const zh = zhCN['avatarReference.stop.confirm'];
  assert.ok(zh.includes('删除'), zh);
  assert.ok(zh.includes('保留'), 'the kept previews must be named, or the control over-promises');
  const en = enUS['avatarReference.stop.confirm'];
  assert.ok(/delet/i.test(en) && /kept/i.test(en), en);
});

check('the delete confirmation says the previews go too, and that it is final', () => {
  const zh = zhCN['avatarReference.delete.confirm'];
  assert.ok(zh.includes('预览') || zh.includes('预演'), zh);
  assert.ok(zh.includes('不能撤销'), zh);
  const en = enUS['avatarReference.delete.confirm'];
  assert.ok(/previews/i.test(en) && /cannot be undone/i.test(en), en);
});

check('the two destructive labels are DIFFERENT sentences in both locales', () => {
  // They map to the same endpoint under different parameters, which is exactly
  // why their copy must not be interchangeable.
  assert.notEqual(zhCN['avatarReference.stop'], zhCN['avatarReference.delete']);
  assert.notEqual(zhCN['avatarReference.stop.sub'], zhCN['avatarReference.delete.sub']);
  assert.notEqual(enUS['avatarReference.stop'], enUS['avatarReference.delete']);
  assert.notEqual(enUS['avatarReference.stop.sub'], enUS['avatarReference.delete.sub']);
});

check('the set-up-again copy says a new photo and a new authorization are needed', () => {
  // Both delete branches remove the source photo, so re-enabling is not an undo.
  // Saying otherwise would promise a button we do not have.
  assert.ok(zhCN['avatarReference.setUpAgain.sub'].includes('照片'));
  assert.ok(/photo/i.test(enUS['avatarReference.setUpAgain.sub']));
});

check('no body, size, age or appearance claim reaches this copy (§15 prohibitions)', () => {
  const banned = [
    '瘦',
    '胖',
    '身材',
    '三围',
    '尺码',
    '年龄',
    'slim',
    'body shape',
    'measurement',
    'size',
    'age',
    'flatter',
  ];
  for (const key of KEYS) {
    for (const locale of [zhCN, enUS] as const) {
      const text = (locale as Record<string, string>)[key] ?? '';
      for (const word of banned) {
        assert.ok(
          !text.toLowerCase().includes(word.toLowerCase()),
          `${key} contains a forbidden claim: ${word} → ${text}`,
        );
      }
    }
  }
});

check('the retired `avatarSetup.problem.revoked` copy is gone from both catalogues', () => {
  // It said the reference could not be turned back on. V3-021 made that false.
  assert.equal((zhCN as Record<string, string>)['avatarSetup.problem.revoked'], undefined);
  assert.equal((enUS as Record<string, string>)['avatarSetup.problem.revoked'], undefined);
  assert.ok(!SCREEN.includes('revoked'));
});

console.log(`\navatarReference: ${checks} checks passed`);
