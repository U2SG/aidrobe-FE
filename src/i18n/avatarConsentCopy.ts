/**
 * V3-014 — the consent copy version, kept next to the exact copy it names.
 *
 * ## Open human gate
 *
 * V3_SPEC §4.3 and this feature's `human_gate` both make the production
 * user-facing consent copy a HUMAN APPROVAL, and the FE flag `ENABLE_V3_AVATAR`
 * defaults off. The value below is therefore written to be unmistakable in an
 * audit row: anything shipped to production must read as approved copy, and
 * `unapproved` in a production `avatar_source_assets.consent_version` is the
 * signal that the gate was skipped.
 *
 * ## Why the version lives here and not in the sheet
 *
 * `POST …/consent` stores this string as the record of *which copy the user
 * accepted* (V3-013 acceptance 1). That record is only meaningful if the string
 * changes when the copy changes — so the version sits directly above the list
 * of keys whose text it names, where an edit to the copy and a stale version
 * are visible in one screen. `scripts/avatarCandidatePrompt.test.ts` pins the
 * key list against both catalogues, so a renamed or deleted key fails the
 * build rather than silently narrowing what the version covers.
 *
 * Bounded at 64 characters to match `avatar_source_assets.consent_version`
 * (the BE refuses longer with `4001` rather than truncating).
 */
export const AVATAR_CONSENT_COPY_VERSION = 'v3-p0-2026-08-14-unapproved';

/**
 * Every i18n key rendered inside the consent sheet — i.e. the exact copy
 * `AVATAR_CONSENT_COPY_VERSION` stands for. §15 requires an authorization to
 * state, separately: what it is used for, whether it goes to a third-party
 * model, and how to replace/delete it. Each of those clauses is a key here, so
 * "the copy explains X" is checkable against this list rather than by reading
 * the component.
 *
 * TWO DELIBERATE EXCLUSIONS, both for the same reason: this list defines what a
 * stored `consent_version` STANDS FOR, so only text the user authorized may
 * join it. Adding either would silently widen the meaning of every version
 * already recorded. Both exclusions are pinned by a test rather than left to
 * this comment.
 *   - `avatarConsent.unavailable` — the toast shown when an accept fails
 *     unretryably. Rendered by `ToastHost`, never inside the sheet, and a
 *     failure notice is no part of an authorization.
 *   - `avatarConsent.more` — the fold notice shown while copy remains below the
 *     scroller. It points AT the clauses; it is not one of them.
 */
export const AVATAR_CONSENT_COPY_KEYS = [
  'avatarConsent.title',
  'avatarConsent.purpose',
  'avatarConsent.thirdParty',
  'avatarConsent.control',
  'avatarConsent.accept',
  'avatarConsent.decline',
  'avatarConsent.error',
  'avatarConsent.retry',
  'avatarConsent.previewAlt',
] as const;

/**
 * The three §15 authorization clauses — the part of the version that is
 * IDENTICAL on every surface that takes this consent.
 *
 * ## Why this subset exists (V3-015), and what the §4.3 gate has to decide
 *
 * One `consent_version` now covers two surfaces: V3-014's passive candidate
 * sheet and V3-015's on-demand setup screen. They render these three clauses
 * from the same keys, verbatim — that is the substantive text the user
 * authorizes, and a test on each surface pins it.
 *
 * They do NOT share their chrome. The sheet renders `avatarConsent.title` /
 * `.decline`; the setup screen renders `avatarSetup.reviewTitle` and
 * `avatarSetup.another` (+ `.anotherHint`), because "choose another photo"
 * is a different action from "decline", even though both post `accept=false`.
 * So a stored version string stands for identical clause text plus
 * surface-specific framing.
 *
 * That is a deliberate call, not an oversight, and it is exactly the kind of
 * thing V3_SPEC §4.3's human copy approval exists to settle: either the version
 * is declared to name the clauses only (this subset), or each surface gets its
 * own version string. Recorded here rather than in the frozen contract because
 * nothing crosses the FE/BE boundary — the BE stores whatever string it is
 * given — and flagged in `feature_list.json` so the gate sees it.
 */
export const AVATAR_CONSENT_CLAUSE_KEYS = [
  'avatarConsent.purpose',
  'avatarConsent.thirdParty',
  'avatarConsent.control',
] as const;
