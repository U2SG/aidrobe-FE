// V3-008 — contract test: the FE mapping's frozen vocabularies and nullability
// assumptions are pinned against the mirrored OpenAPI artifact
// (docs/openapi.json, byte-aligned with the BE by ./init.sh contract).
// If either side drifts — a BE enum change, a silently re-shaped response, or
// an FE constant edited apart from the contract — this fails.
// RN-free; run: node scripts/purchaseDecisionContract.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANDIDATE_SOURCE_TYPES,
  CANDIDATE_STATUSES,
  COMPARISON_RELATIONS,
  DECISION_CONCERNS,
  DECISION_NEXT_ACTIONS,
  DECISION_REASON_KINDS,
  DECISION_UNCERTAINTIES,
  DECISION_VISUAL_NEEDS,
  PURCHASE_DECISIONS,
} from '../src/api/purchaseDecisionMapping.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(scriptsDir, '..', 'docs', 'openapi.json'), 'utf-8'));
const schemas = spec.components.schemas;

function sameSet(label: string, actual: string[], expected: readonly string[]) {
  check(`${label}: same size`, actual.length === expected.length);
  check(`${label}: same members`, expected.every((v) => actual.includes(v)));
}

function isNullable(prop: { anyOf?: { type?: string }[] }): boolean {
  return Array.isArray(prop.anyOf) && prop.anyOf.some((v) => v.type === 'null');
}

// --- The four frozen §5.1 paths exist with the right methods ----------------

const paths = spec.paths;
check('POST /v1/purchase-candidates exists', Boolean(paths['/v1/purchase-candidates']?.post));
check(
  'GET /v1/purchase-candidates/{candidate_id} exists',
  Boolean(paths['/v1/purchase-candidates/{candidate_id}']?.get),
);
check(
  'POST …/{candidate_id}/decision exists',
  Boolean(paths['/v1/purchase-candidates/{candidate_id}/decision']?.post),
);
const replay = paths['/v1/wardrobe-decisions/{decision_id}']?.get;
check('GET /v1/wardrobe-decisions/{decision_id} exists (V3-008)', Boolean(replay));

// The replay surface advertises its known error states, so a client can map
// them without runtime discovery (acceptance 3).
check('replay advertises 404', Boolean(replay.responses['404']));
check('replay advertises 503 (flag off)', Boolean(replay.responses['503']));
check(
  'replay returns the same frozen decision shape as the deciding POST',
  JSON.stringify(replay.responses['200'].content['application/json'].schema) ===
    JSON.stringify(
      paths['/v1/purchase-candidates/{candidate_id}/decision'].post.responses['200'].content[
        'application/json'
      ].schema,
    ),
);

// --- WardrobeDecisionResponse: the frozen §5.3 shape -------------------------

const decision = schemas.WardrobeDecisionResponse;
sameSet('decision response keys', Object.keys(decision.properties), [
  'id',
  'candidate_id',
  'decision',
  'decision_text',
  'reasons',
  'closet_comparison',
  'uncertainty',
  'visual_need',
  'boundary_note',
  'next_actions',
  'created_at',
]);
sameSet('decision enum', decision.properties.decision.enum, PURCHASE_DECISIONS);
sameSet('uncertainty enum', decision.properties.uncertainty.enum, DECISION_UNCERTAINTIES);
sameSet('visual_need enum', decision.properties.visual_need.enum, DECISION_VISUAL_NEEDS);
sameSet('next_actions enum', decision.properties.next_actions.items.enum, DECISION_NEXT_ACTIONS);
sameSet('reason kind enum', schemas.DecisionReasonModel.properties.kind.enum, DECISION_REASON_KINDS);
sameSet(
  'relation enum',
  schemas.ComparisonItemModel.properties.relation.enum,
  COMPARISON_RELATIONS,
);
check(
  'no numeric field in the decision shape (no suitability score)',
  Object.values(decision.properties as Record<string, { type?: string }>).every(
    (p) => p.type !== 'number' && p.type !== 'integer',
  ),
);

// --- Acceptance 2: optional evidence / visual metadata are nullable ---------

check('candidate_id is nullable', isNullable(decision.properties.candidate_id));
check(
  'similar_items[].image_url is nullable (visual metadata)',
  isNullable(schemas.ComparisonItemModel.properties.image_url),
);
check(
  'parsed_item is nullable on the candidate',
  isNullable(schemas.PurchaseCandidateResponse.properties.parsed_item),
);
const parsedProps = schemas.ParsedItemModel.properties as Record<
  string,
  { anyOf?: { type?: string }[] }
>;
sameSet('parsed_item fields', Object.keys(parsedProps), [
  'category',
  'colors',
  'silhouette',
  'material_hints',
  'price',
  'scene_tags',
]);
check(
  'every parsed_item field is nullable (contract §5.2: all fields nullable)',
  Object.values(parsedProps).every(isNullable),
);

// --- Candidate request/response vocabularies ---------------------------------

sameSet(
  'source_type enum',
  schemas.CreatePurchaseCandidateRequest.properties.source_type.enum,
  CANDIDATE_SOURCE_TYPES,
);
sameSet(
  'candidate status enum',
  schemas.PurchaseCandidateResponse.properties.status.enum,
  CANDIDATE_STATUSES,
);
sameSet('concern enum', schemas.DecisionRequest.properties.concern.enum, DECISION_CONCERNS);
check(
  'concern defaults to none (optional body)',
  schemas.DecisionRequest.properties.concern.default === 'none',
);

console.log(`purchaseDecisionContract: ${passed}/${passed} cases passed`);
