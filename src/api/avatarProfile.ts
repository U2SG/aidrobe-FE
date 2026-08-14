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
// than toasted. `replace` / `delete` remain V3-021's and are still absent.

import type { AxiosRequestConfig } from 'axios';

import { apiGet, apiPost } from './client';
import {
  buildConsentBody,
  toAvatarPreparation,
  toAvatarProfile,
  toAvatarUploadRegistration,
  type AvatarPreparation,
  type AvatarProfile,
  type AvatarUploadRegistration,
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
