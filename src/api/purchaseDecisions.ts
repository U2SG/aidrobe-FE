// V3-008 — thin typed wrappers for the four frozen §5.1 purchase-decision
// endpoints. All shapes, vocabularies and skew rules live in
// `purchaseDecisionMapping.ts` (RN-free, Node-tested); this file only carries
// the HTTP calls, so no decision logic can hide in here either.
//
// Callers whose surface renders its own error state (V3-009's decision card
// does) pass `{ silentErrorToast: true }` so the global toast stays quiet, and
// map failures through `toDecisionErrorState` — every wrapper forwards a
// per-request `config` so that flag actually reaches the interceptor
// (codex review, FE#137).

import type { AxiosRequestConfig } from 'axios';

import { apiGet, apiPost } from './client';
import {
  toPurchaseCandidate,
  toWardrobeDecision,
  type CandidateSourceType,
  type DecisionConcern,
  type PurchaseCandidate,
  type ServerPurchaseCandidate,
  type ServerWardrobeDecision,
  type WardrobeDecision,
} from './purchaseDecisionMapping';

export interface CreateCandidateInput {
  sourceType: CandidateSourceType;
  /** Product link, for `share_link` / `ask_link`. */
  sourceUrl?: string;
  /** Presign `object_key` (NOT a uuid, NOT the TTL-bound `file_url`), for
   * `screenshot` / `order_image` (contract §5.2). */
  sourceAssetId?: string;
}

export async function createPurchaseCandidate(
  input: CreateCandidateInput,
  config?: AxiosRequestConfig,
): Promise<PurchaseCandidate> {
  // NOTE for error mapping: this endpoint's 404 means "invalid source asset
  // key", so map its failures with `toDecisionErrorState(error, 'create')`.
  const data = await apiPost<ServerPurchaseCandidate>(
    '/v1/purchase-candidates',
    {
      source_type: input.sourceType,
      source_url: input.sourceUrl ?? null,
      source_asset_id: input.sourceAssetId ?? null,
    },
    undefined,
    config,
  );
  return toPurchaseCandidate(data);
}

// Parsing is synchronous in P0 (contract §5.2): the POST already returns a
// terminal status, so polling is optional-and-usually-unnecessary. If a caller
// does poll, it must stop on `isTerminal` — which is true for every status
// except `submitted`, unknown ones included, so version skew cannot spin it.
export async function getPurchaseCandidate(
  candidateId: string,
  config?: AxiosRequestConfig,
): Promise<PurchaseCandidate> {
  const data = await apiGet<ServerPurchaseCandidate>(
    `/v1/purchase-candidates/${candidateId}`,
    undefined,
    config,
  );
  return toPurchaseCandidate(data);
}

export async function decidePurchaseCandidate(
  candidateId: string,
  concern: DecisionConcern = 'none',
  config?: AxiosRequestConfig,
): Promise<WardrobeDecision> {
  // Idempotent per candidate: a repeated call replays the first decision and
  // ignores a new concern (contract §5.3) — do not offer "re-evaluate" UI.
  const data = await apiPost<ServerWardrobeDecision>(
    `/v1/purchase-candidates/${candidateId}/decision`,
    { concern },
    undefined,
    config,
  );
  return toWardrobeDecision(data);
}

export async function getWardrobeDecision(
  decisionId: string,
  config?: AxiosRequestConfig,
): Promise<WardrobeDecision> {
  const data = await apiGet<ServerWardrobeDecision>(
    `/v1/wardrobe-decisions/${decisionId}`,
    undefined,
    config,
  );
  return toWardrobeDecision(data);
}
