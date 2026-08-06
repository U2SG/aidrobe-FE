// V3-002 — the FE mirror of the V3 analytics contract must equal the shared
// artifact. `docs/v3-analytics-events.json` is byte-identical with aidrobe-BE's
// copy, and BE's tests/unit/test_v3_analytics_events.py asserts the Python
// mirror against the same file — so both sides provably derive from one
// contract. Run: node scripts/v3AnalyticsEvents.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  V3_ANALYTICS_SCHEMA_VERSION,
  V3_EVENT_SPECS,
  V3_FE_OWNED_EVENTS,
  V3_FLOW_ID_HEADER,
  V3_FORBIDDEN_FIELD_NAMES,
  buildV3EventProps,
  newFlowId,
  validateV3Event,
  type V3EventName,
} from '../src/utils/v3AnalyticsEvents.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const contract = JSON.parse(
  readFileSync(join(repoRoot, 'docs', 'v3-analytics-events.json'), 'utf8'),
) as {
  schema_version: number;
  flow_id_header: string;
  envelope: { fields: Record<string, { type: string; required: boolean }> };
  forbidden_field_names: string[];
  events: Record<
    string,
    {
      owner: string;
      group: string;
      flow_id: string;
      fields: Record<string, { type: string; required: boolean; values?: string[]; min?: number; max?: number }>;
    }
  >;
  metrics: Record<string, { events: string[]; fields: string[]; kill_criteria: number[] }>;
  qualitative_only_kill_criteria: Record<string, string>;
};

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// --- the mirror equals the artifact ------------------------------------------

check('schema_version matches', V3_ANALYTICS_SCHEMA_VERSION === contract.schema_version);
check('flow_id header matches', V3_FLOW_ID_HEADER === contract.flow_id_header);
assert.deepEqual(
  Object.keys(V3_EVENT_SPECS).sort(),
  Object.keys(contract.events).sort(),
  'event name set matches the contract',
);
passed += 1;
assert.deepEqual([...V3_FORBIDDEN_FIELD_NAMES], contract.forbidden_field_names, 'forbidden names match');
passed += 1;

for (const [name, expected] of Object.entries(contract.events)) {
  const spec = V3_EVENT_SPECS[name as V3EventName];
  check(`${name}: owner`, spec.owner === expected.owner);
  check(`${name}: group`, spec.group === expected.group);
  check(`${name}: flow_id rule`, spec.flow_id === expected.flow_id);
  assert.deepEqual(Object.keys(spec.fields).sort(), Object.keys(expected.fields).sort(), `${name}: field names`);
  passed += 1;
  for (const [fieldName, expectedField] of Object.entries(expected.fields)) {
    const field = spec.fields[fieldName]!;
    check(`${name}.${fieldName}: type`, field.type === expectedField.type);
    check(`${name}.${fieldName}: required`, field.required === expectedField.required);
    assert.deepEqual(
      field.values ? [...field.values] : undefined,
      expectedField.values,
      `${name}.${fieldName}: enum values`,
    );
    passed += 1;
    if (expectedField.type === 'integer') {
      check(`${name}.${fieldName}: min`, field.min === expectedField.min);
      check(`${name}.${fieldName}: max`, field.max === expectedField.max);
    }
  }
}

// The client may only emit what it owns; BE-owned events would double-count.
assert.deepEqual(
  [...V3_FE_OWNED_EVENTS].sort(),
  Object.entries(contract.events)
    .filter(([, spec]) => spec.owner === 'fe')
    .map(([name]) => name)
    .sort(),
  'FE-owned event list matches the contract',
);
passed += 1;

// --- privacy invariant --------------------------------------------------------

for (const [name, spec] of Object.entries(V3_EVENT_SPECS)) {
  for (const [fieldName, field] of Object.entries(spec.fields)) {
    check(`${name}.${fieldName} is not a forbidden name`, !V3_FORBIDDEN_FIELD_NAMES.includes(fieldName));
    check(
      `${name}.${fieldName} is a closed value space`,
      field.type === 'boolean' ||
        field.type === 'integer' ||
        ((field.type === 'enum' || field.type === 'enum_array') && (field.values?.length ?? 0) > 0),
    );
  }
}

check(
  'a forbidden field is rejected with a privacy error',
  validateV3Event('v3_preview_viewed', { result: 'shown', image_url: 'https://x.test/a.jpg' }, 'f')?.includes(
    'forbidden by the privacy contract',
  ) === true,
);

// --- metrics resolve against the events (kill-criteria coverage) ---------------

const envelopeFields = Object.keys(contract.envelope.fields);
for (const [metric, spec] of Object.entries(contract.metrics)) {
  check(`${metric} references at least one event`, spec.events.length > 0);
  const known = new Set(envelopeFields);
  for (const eventName of spec.events) {
    check(`${metric} references a real event (${eventName})`, eventName in contract.events);
    for (const field of Object.keys(contract.events[eventName]!.fields)) known.add(field);
  }
  for (const field of spec.fields) {
    check(`${metric} references a real field (${field})`, known.has(field));
  }
}

const computable = new Set(Object.values(contract.metrics).flatMap((m) => m.kill_criteria));
const qualitative = new Set(Object.keys(contract.qualitative_only_kill_criteria).map(Number));
for (let criterion = 1; criterion <= 10; criterion += 1) {
  check(
    `kill criterion ${criterion} is covered exactly once`,
    computable.has(criterion) !== qualitative.has(criterion),
  );
}

// Decision value stays measurable with every visual flag off.
for (const metric of ['decision_completion_rate', 'decision_action_rate', 'repeat_use_rate']) {
  for (const eventName of contract.metrics[metric]!.events) {
    check(`${metric} needs no preview event`, contract.events[eventName]!.group === 'decision');
  }
}

// --- validation behavior (mirrors the BE tests) --------------------------------

check('valid payload passes', validateV3Event('v3_decision_viewed', { decision: 'wait' }, 'flow-1') === null);
check(
  'optional field may be omitted',
  validateV3Event('v3_preview_feedback', { verdict: 'looks_like_me' }, 'flow-1') === null,
);
check(
  'missing flow_id is rejected',
  validateV3Event('v3_decision_viewed', { decision: 'wait' }) === 'v3_decision_viewed: flow_id is required',
);
check(
  'inapplicable flow_id is rejected',
  validateV3Event('v3_avatar_deleted', { purge_derived: true }, 'flow-1')?.includes('does not apply') === true,
);
check(
  'avatar prompt accepts both with and without a flow',
  validateV3Event('v3_avatar_prompt_shown', { source_type: 'ootd_photo', context: 'post_flow_sheet' }) === null &&
    validateV3Event(
      'v3_avatar_prompt_shown',
      { source_type: 'user_upload', context: 'preview_request' },
      'flow-1',
    ) === null,
);
check(
  'missing required field is rejected',
  validateV3Event('v3_decision_viewed', {}, 'flow-1')?.includes("missing required field 'decision'") === true,
);
check(
  'unknown field is rejected',
  validateV3Event('v3_decision_viewed', { decision: 'wait', extra: 1 }, 'flow-1')?.includes(
    "unknown field 'extra'",
  ) === true,
);
check(
  'bad enum value is rejected',
  validateV3Event('v3_decision_viewed', { decision: 'maybe' }, 'flow-1')?.includes('expected one of') === true,
);
check(
  'out-of-range integer is rejected',
  validateV3Event(
    'v3_preview_outcome',
    { generation_status: 'ready', cache_hit: true, retry_count: 2 },
    'flow-1',
  )?.includes('above maximum 1') === true,
);
check(
  'non-boolean is rejected',
  validateV3Event('v3_avatar_consent', { accepted: 'yes', source_type: 'user_upload' })?.includes(
    'expected boolean',
  ) === true,
);
check(
  'bad enum_array item is rejected',
  validateV3Event('v3_preview_feedback', { verdict: 'looks_like_me', aspects: ['cheekbones'] }, 'flow-1')?.includes(
    'expected items from',
  ) === true,
);
check(
  'enum_array rejects a bare string',
  validateV3Event('v3_preview_feedback', { verdict: 'looks_like_me', aspects: 'face' }, 'flow-1')?.includes(
    'expected a list',
  ) === true,
);

// --- flow id + envelope ---------------------------------------------------------

const flowId = newFlowId();
check('flow id is a v4 uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(flowId));
check('flow ids are distinct', newFlowId() !== newFlowId());

const props = buildV3EventProps(
  { decision: 'worth_adding' },
  { platform: 'ios', userId: '5e1c1c1e-0000-4000-8000-000000000001', flowId },
  '2026-08-06T09:00:00.000Z',
);
assert.deepEqual(
  Object.keys(props).filter((key) => key !== 'decision').sort(),
  envelopeFields.slice().sort(),
  'emitted envelope matches the contract envelope',
);
passed += 1;
check('payload rides alongside the envelope', props.decision === 'worth_adding');

const withoutFlow = buildV3EventProps(
  { source_type: 'ootd_photo', context: 'post_flow_sheet' },
  { platform: 'android', userId: '5e1c1c1e-0000-4000-8000-000000000002' },
  '2026-08-06T09:00:00.000Z',
);
check('flow_id is omitted rather than null when absent', !('flow_id' in withoutFlow));

console.log(`v3AnalyticsEvents: ${passed} checks passed`);
