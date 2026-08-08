// V3-008 — thin typed wrappers for the four frozen §5.1 purchase-decision
// endpoints. All shapes, vocabularies and skew rules live in
// `purchaseDecisionMapping.ts` (RN-free, Node-tested); this file only carries
// the HTTP calls, so no decision logic can hide in here either.
//
// Screens arrive with V3-009/V3-010; nothing imports this yet. Callers whose
// surface hides itself on error should pass `{ silentErrorToast: true }` and
// map failures through `toDecisionErrorState`.

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
): Promise<PurchaseCandidate> {
  const data = await apiPost<ServerPurchaseCandidate>('/v1/purchase-candidates', {
    source_type: input.sourceType,
    source_url: input.sourceUrl ?? null,
    source_asset_id: input.sourceAssetId ?? null,
  });
  return toPurchaseCandidate(data);
}

// Parsing is synchronous in P0 (contract §5.2): the POST already returns a
// terminal status, so polling is optional-and-usually-unnecessary. If a caller
// does poll, it must stop on `isTerminal` — which is true for every status
// except `submitted`, unknown ones included, so version skew cannot spin it.
export async function getPurchaseCandidate(candidateId: string): Promise<PurchaseCandidate> {
  const data = await apiGet<ServerPurchaseCandidate>(`/v1/purchase-candidates/${candidateId}`);
  return toPurchaseCandidate(data);
}

export async function decidePurchaseCandidate(
  candidateId: string,
  concern: DecisionConcern = 'none',
): Promise<WardrobeDecision> {
  // Idempotent per candidate: a repeated call replays the first decision and
  // ignores a new concern (contract §5.3) — do not offer "re-evaluate" UI.
  const data = await apiPost<ServerWardrobeDecision>(
    `/v1/purchase-candidates/${candidateId}/decision`,
    { concern },
  );
  return toWardrobeDecision(data);
}

export async function getWardrobeDecision(decisionId: string): Promise<WardrobeDecision> {
  const data = await apiGet<ServerWardrobeDecision>(`/v1/wardrobe-decisions/${decisionId}`);
  return toWardrobeDecision(data);
}
