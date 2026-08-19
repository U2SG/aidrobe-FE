// V3-014 — thin typed wrappers for the two §4.2 avatar surfaces this feature
// touches. All shapes, vocabularies and skew rules live in
// `avatarProfileMapping.ts` (RN-free, Node-tested); this file only carries the
// HTTP calls, so no contract logic can hide in here either.
//
// Both default to `silentErrorToast: true`. The discovery GET is passive — a
// global "出错了" toast fired by a request the user never made, moments after
// they saved an OOTD photo or finished an import, reads as *that* flow having
// failed (acceptance 2). The consent POST is user-initiated, so its caller
// renders an explicit in-sheet error and retry instead of a toast that vanishes.
//
// V3-015 adds the two source-C surfaces (`uploads`, `prepare`) on the same
// terms: user-initiated, so their failures are rendered by the caller rather
// than toasted. V3-021 adds the last two — `replace` and `delete` — for the §15
// Profile controls, on the same terms again.

import type { AxiosRequestConfig } from 'axios';

import { apiDelete, apiGet, apiPost } from './client';
import {
  buildConsentBody,
  toAvatarDeletion,
  toAvatarPreparation,
  toAvatarProfile,
  toAvatarUploadRegistration,
  type AvatarDeletion,
  type AvatarPreparation,
  type AvatarProfile,
  type AvatarUploadRegistration,
  type ServerAvatarDeletion,
  type ServerAvatarPreparation,
  type ServerAvatarProfile,
  type ServerAvatarUploadRegistration,
} from './avatarProfileMapping';

const SILENT: AxiosRequestConfig = { silentErrorToast: true };

/** `status=none` is a normal 200, not a 404 (contract §4.2). */
export async function getAvatarProfile(config?: AxiosRequestConfig): Promise<AvatarProfile> {
  const data = await apiGet<ServerAvatarProfile>('/v1/avatar-profile', undefined, {
    ...SILENT,
    ...config,
  });
  return toAvatarProfile(data);
}

/**
 * Accept or decline ONE candidate. `accept=false` dismisses that asset
 * permanently server-side (§4.2), which is what makes the answer durable
 * beyond this device's ledger.
 *
 * `consentVersion` is only sent when accepting — see `buildConsentBody`.
 */
export async function decideAvatarConsent(
  sourceAssetId: string,
  accept: boolean,
  consentVersion: string,
  config?: AxiosRequestConfig,
): Promise<void> {
  await apiPost(
    `/v1/avatar-candidates/${sourceAssetId}/consent`,
    buildConsentBody(accept, consentVersion),
    undefined,
    { ...SILENT, ...config },
  );
}

/**
 * Source C — hand a deliberately provided photo to candidate detection.
 *
 * The body carries the presign `object_key`, never the TTL-bound `file_url`:
 * both are accepted by the endpoint, but the key is the durable reference and
 * the one this client already holds (contract §4.2, and the same rule §5.2
 * fixed for purchase candidates). Registration is NOT consent — it queues an
 * assessment, and the user still authorizes the photo through
 * `decideAvatarConsent`.
 */
export async function registerAvatarUpload(
  objectKey: string,
  config?: AxiosRequestConfig,
): Promise<AvatarUploadRegistration> {
  const data = await apiPost<ServerAvatarUploadRegistration>(
    '/v1/avatar-profile/uploads',
    { object_key: objectKey },
    undefined,
    { ...SILENT, ...config },
  );
  return toAvatarUploadRegistration(data);
}

/**
 * Start preparation from the consented source.
 *
 * Consent alone moves the profile to `preparing` but enqueues nothing
 * (`AvatarLifecycle.record_consent`), so without this call the user would watch
 * a `preparing` profile that no worker will ever pick up. `replace` is
 * deliberately not wrapped here — it needs a version to swap out and belongs to
 * V3-021.
 */
export async function startAvatarPreparation(
  config?: AxiosRequestConfig,
): Promise<AvatarPreparation> {
  const data = await apiPost<ServerAvatarPreparation>('/v1/avatar-profile/prepare', {}, undefined, {
    ...SILENT,
    ...config,
  });
  return toAvatarPreparation(data);
}

/**
 * V3-021 — 替换: prepare a new version and swap it in on success (§4.2).
 *
 * Only legal while a version exists to swap out, which is what
 * `avatarReferenceControls` gates on. The swap happens inside the worker's
 * `activate_version`, so a failed replacement leaves the live version alone —
 * there is never a gap where a ready avatar disappears. Nothing here waits for
 * that: the response reports the enqueue, and the screen says a new version is
 * being prepared rather than claiming it is done.
 */
export async function replaceAvatarVersion(
  config?: AxiosRequestConfig,
): Promise<AvatarPreparation> {
  const data = await apiPost<ServerAvatarPreparation>('/v1/avatar-profile/replace', {}, undefined, {
    ...SILENT,
    ...config,
  });
  return toAvatarPreparation(data);
}

/**
 * V3-021 — the two destructive §15 Profile controls, which are one endpoint.
 *
 * `purgeDerived=false` is 停止用于生成 and `true` is 删除形象参考及派生结果; the
 * frozen §4.2 parameter has no default precisely because the caller must decide,
 * and these are the two decisions. It rides in the URL rather than in an axios
 * `params` bag because `apiDelete` takes no params argument — and because an
 * omitted required parameter is a 422 about somebody's photos, which is the one
 * failure mode worth making impossible to reach by accident.
 */
export async function deleteAvatarProfile(
  purgeDerived: boolean,
  config?: AxiosRequestConfig,
): Promise<AvatarDeletion> {
  const data = await apiDelete<ServerAvatarDeletion>(
    `/v1/avatar-profile?purge_derived=${purgeDerived ? 'true' : 'false'}`,
    { ...SILENT, ...config },
  );
  return toAvatarDeletion(data);
}
