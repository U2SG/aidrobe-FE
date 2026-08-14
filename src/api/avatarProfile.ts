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
// The remaining §4.2 surfaces (uploads / prepare / replace / delete) belong to
// V3-015 and V3-021 and are deliberately absent.

import type { AxiosRequestConfig } from 'axios';

import { apiGet, apiPost } from './client';
import {
  buildConsentBody,
  toAvatarProfile,
  type AvatarProfile,
  type ServerAvatarProfile,
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
