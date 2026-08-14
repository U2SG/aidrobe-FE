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
