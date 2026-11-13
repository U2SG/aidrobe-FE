// V3-023 — the FE half of the rollout dashboard contract.
//
// `docs/v3-rollout-dashboard.json` is byte-identical with aidrobe-BE's copy
// (BE's tests/unit/test_v3_rollout_dashboard.py asserts it against
// app/common/rollout_dashboard.py, the generator of record). This file proves
// the FE half of the computability chain:
//
//   kill criterion -> metric -> event field -> event -> FE emitter
//
// The chain is only as strong as its weakest side. BE can assert that
// `v3_decision_action` carries `action`; it cannot assert that this app ever
// emits that event, and a dashboard panel fed by an event nobody emits shows an
// empty chart, not an error. So the emitter scan below is the point of this
// file, not the mirror check.
//
// Run: node scripts/v3RolloutDashboard.test.ts
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { V3_EVENT_SPECS, V3_FE_OWNED_EVENTS } from '../src/utils/v3AnalyticsEvents.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

type PanelSpec = {
  question: string;
  headline_metric: string;
  supporting_metrics: string[];
  segment_by: string[];
  spec_ref: string;
};

const dashboard = JSON.parse(
  readFileSync(join(repoRoot, 'docs', 'v3-rollout-dashboard.json'), 'utf8'),
) as {
  contract: string;
  schema_version: number;
  source_contract: string;
  source_schema_version: number;
  required_dimensions: string[];
  panels: Record<string, PanelSpec>;
  cost_model: {
    formula: string;
    generation_metric: string;
    unit_price_per_generation: number | null;
    currency: string | null;
    human_gate: string;
  };
  kill_criteria: Record<
    string,
    { coverage: string; reason: string | null; metrics: string[]; panels: string[] }
  >;
  pipeline_prerequisites: { requirement: string; met: boolean; detail: string; human_gate: string | null }[];
  readiness_gates: {
    group: string;
    statement: string;
    status: string;
    evidence: string[];
    blocker: string | null;
    human_gate: string | null;
  }[];
  seed_study: {
    question: string;
    what_to_observe: string;
    discharges: string[];
    supporting_metric: string | null;
    spec_ref: string;
  }[];
  open_human_gates: Record<string, { decision: string; why_human: string; blocks: string[] }>;
};

const events = JSON.parse(
  readFileSync(join(repoRoot, 'docs', 'v3-analytics-events.json'), 'utf8'),
) as {
  contract: string;
  schema_version: number;
  envelope: { fields: Record<string, unknown> };
  forbidden_field_names: string[];
  events: Record<string, { owner: string; fields: Record<string, unknown> }>;
  metrics: Record<string, { events: string[]; fields: string[]; kill_criteria: number[] }>;
};

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

// --- the dashboard is built on THIS repo's copy of the event contract --------
// A mirror that silently referenced a metric the local event artifact does not
// define would leave FE and BE disagreeing about what the dashboard needs.

check('dashboard names the rollout contract', dashboard.contract === 'aidrobe-v3-rollout-dashboard');
check('dashboard schema_version is 1', dashboard.schema_version === 1);
check('dashboard points at the event contract', dashboard.source_contract === events.contract);
check(
  'dashboard pins the event contract version it was built against',
  dashboard.source_schema_version === events.schema_version,
);

const REQUIRED = [
  'decision_completion',
  'preview_usefulness',
  'repeat_use',
  'hidden_quality_rate',
  'latency',
  'cost_per_useful_decision',
];
check('all six required dimensions are declared', REQUIRED.every((d) => dashboard.required_dimensions.includes(d)));
check('every required dimension has a panel', REQUIRED.every((d) => dashboard.panels[d] !== undefined));

const panelMetrics = Object.values(dashboard.panels).flatMap((p) => [
  p.headline_metric,
  ...p.supporting_metrics,
]);
for (const metric of panelMetrics) {
  check(`panel metric ${metric} exists in the event contract`, events.metrics[metric] !== undefined);
}
check(
  'every metric in the event contract reaches a panel',
  Object.keys(events.metrics).every((m) => panelMetrics.includes(m)),
);
check('no metric is surfaced twice', new Set(panelMetrics).size === panelMetrics.length);

// --- computability, checked independently of the BE test ---------------------

const envelopeFields = new Set(Object.keys(events.envelope.fields));
function reachableFields(eventNames: string[]): Set<string> {
  const reachable = new Set(envelopeFields);
  for (const name of eventNames) {
    for (const field of Object.keys(events.events[name]?.fields ?? {})) reachable.add(field);
  }
  return reachable;
}

for (const [metric, spec] of Object.entries(events.metrics)) {
  const reachable = reachableFields(spec.events);
  for (const field of spec.fields) {
    check(`metric ${metric} can read ${field}`, reachable.has(field));
  }
}

for (const [dimension, panel] of Object.entries(dashboard.panels)) {
  const panelEvents = [...new Set([panel.headline_metric, ...panel.supporting_metrics].flatMap((m) => events.metrics[m].events))];
  const reachable = reachableFields(panelEvents);
  for (const field of panel.segment_by) {
    check(`panel ${dimension} can segment by ${field}`, reachable.has(field));
  }
  for (const field of panel.segment_by) {
    check(`panel ${dimension} segment ${field} is not privacy-forbidden`, !events.forbidden_field_names.includes(field));
  }
}

const killCriteria = Object.entries(dashboard.kill_criteria);
check('all ten kill criteria are mapped', killCriteria.length === 10);
for (const [number, entry] of killCriteria) {
  if (entry.coverage === 'metric') {
    check(`KC${number} names metrics`, entry.metrics.length > 0);
    check(`KC${number} reaches a panel`, entry.panels.length > 0);
    check(`KC${number} is not also excused`, entry.reason === null);
  } else {
    check(`KC${number} is qualitative with a reason`, entry.coverage === 'qualitative' && !!entry.reason);
    check(`KC${number} claims no metric`, entry.metrics.length === 0);
  }
}

// --- the FE emitter link ----------------------------------------------------
// Scan the shipped source for `trackV3('<event>'` call sites. This is the check
// BE structurally cannot make.

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

// Emitter discovery is restricted to CALL SITES, and the contract mirror is
// excluded from the scan. Both restrictions are load-bearing; without them this
// check cannot fail, which is worse than not having it:
//
//   - Matching every `'v3_*'` literal anywhere in src/ collects the registry's
//     OWN declarations (V3_FE_OWNED_EVENTS and the V3_EVENT_SPECS keys), so
//     deleting the last real emitter for an event would still "pass".
//   - Filtering the collected set down to fe-owned names then makes the
//     be-owned assertion below unconditionally true, because the only place a
//     be-owned name appears is the registry that was just filtered out.
//
// So: skip the registry and the dispatcher module, require the literal to be the
// first argument of a `trackV3(` / `emit(` call, and collect ALL v3_ names.
// `\s*` spans newlines on purpose — both `v3_avatar_prompt_shown` call sites put
// the literal on the line after `trackV3(`.
const REGISTRY_FILES = [
  join(repoRoot, 'src', 'utils', 'v3AnalyticsEvents.ts'),
  join(repoRoot, 'src', 'utils', 'analytics.ts'),
];
const CALL_SITE = /\b(?:trackV3|emit)\(\s*'(v3_[a-z_]+)'/g;

const emitterFiles = sourceFiles(join(repoRoot, 'src')).filter((f) => !REGISTRY_FILES.includes(f));
const emittedLiterals = new Set(
  [...emitterFiles.map((f) => readFileSync(f, 'utf8')).join('\n').matchAll(CALL_SITE)].map((m) => m[1]),
);

// Meta-check, so the exclusion above is proved rather than trusted: the registry
// declares all 11 event names, and if the call-site pattern matched declarations
// this would be non-empty and every emitter assertion here would be vacuous.
const registryCallSites = [
  ...REGISTRY_FILES.map((f) => readFileSync(f, 'utf8')).join('\n').matchAll(CALL_SITE),
].map((m) => m[1]);
check(
  `the contract mirror declares no emitter call sites: ${JSON.stringify(registryCallSites)}`,
  registryCallSites.length === 0,
);
check('at least one non-registry source file was scanned', emitterFiles.length > 0);

for (const event of V3_FE_OWNED_EVENTS) {
  check(`fe-owned event ${event} is emitted somewhere in src/`, emittedLiterals.has(event));
}

const beOwned = Object.entries(events.events)
  .filter(([, spec]) => spec.owner === 'be')
  .map(([name]) => name);
for (const event of beOwned) {
  check(`be-owned event ${event} is not emitted by FE`, !emittedLiterals.has(event));
}

// Every field a dashboard metric reads off an fe-owned event must exist in the
// typed FE mirror, or the emitter physically cannot supply it.
for (const [metric, spec] of Object.entries(events.metrics)) {
  for (const eventName of spec.events) {
    if (!V3_FE_OWNED_EVENTS.includes(eventName as never)) continue;
    const declared = new Set(Object.keys(V3_EVENT_SPECS[eventName as never].fields));
    for (const field of spec.fields) {
      if (!Object.keys(events.events[eventName].fields).includes(field)) continue;
      check(`FE mirror declares ${eventName}.${field} for ${metric}`, declared.has(field));
    }
  }
}

// --- readiness and gates ----------------------------------------------------

check('readiness gates are present', dashboard.readiness_gates.length > 0);
for (const gate of dashboard.readiness_gates) {
  if (gate.status === 'verified') {
    check(`verified gate cites evidence: ${gate.statement}`, gate.evidence.length > 0 && gate.blocker === null);
  } else {
    check(`unverified gate names a blocker: ${gate.statement}`, !!gate.blocker);
  }
  if (gate.human_gate) {
    check(`gate references a known human gate: ${gate.human_gate}`, dashboard.open_human_gates[gate.human_gate] !== undefined);
  }
}
check(
  'no visual or product-value gate claims verified',
  dashboard.readiness_gates
    .filter((g) => g.group === 'visual' || g.group === 'product_value')
    .every((g) => g.status !== 'verified'),
);
// The §18 Phase 1 seed study. Checked here as well as on the BE side because
// this artifact is what a reader in this repo has, and a mirror that carried an
// empty or dangling seed plan would misrepresent what a seed round buys.
const gateStatements = new Set(dashboard.readiness_gates.map((g) => g.statement));
check('the seed study carries all five spec questions', dashboard.seed_study.length === 5);
for (const question of dashboard.seed_study) {
  check(`seed question states what to observe: ${question.question}`, question.what_to_observe.length > 0);
  check(
    `seed question discharges a gate or feeds a metric: ${question.question}`,
    question.discharges.length > 0 || question.supporting_metric !== null,
  );
  for (const statement of question.discharges) {
    check(`seed discharge target is a real gate: ${statement}`, gateStatements.has(statement));
  }
  if (question.supporting_metric !== null) {
    check(
      `seed supporting metric ${question.supporting_metric} is frozen`,
      events.metrics[question.supporting_metric] !== undefined,
    );
  }
}
const dischargeable = new Set(dashboard.seed_study.flatMap((q) => q.discharges));
const seedBlocked = dashboard.readiness_gates
  .filter((g) => g.human_gate === 'seed_cohort')
  .map((g) => g.statement);
check(
  `every seed-blocked gate is covered by a seed question: ${JSON.stringify(seedBlocked.filter((s) => !dischargeable.has(s)))}`,
  seedBlocked.every((s) => dischargeable.has(s)),
);

check('cost model invents no price', dashboard.cost_model.unit_price_per_generation === null);
check('cost model invents no currency', dashboard.cost_model.currency === null);
check(
  'the sink gap is declared unmet',
  dashboard.pipeline_prerequisites.some((p) => !p.met && p.human_gate === 'telemetry_sink'),
);

// --- acceptance 3, the FE half ----------------------------------------------
// The flags are baked into the bundle at build time from app.config.ts, so the
// committed default is what a release build ships.

const appConfig = readFileSync(join(repoRoot, 'app.config.ts'), 'utf8');
for (const flag of ['ENABLE_V3_PURCHASE_DECISION', 'ENABLE_V3_AVATAR', 'ENABLE_V3_STATIC_TRYON', 'ENABLE_V3_ANALYTICS']) {
  const pattern = new RegExp(`const ${flag} = \\(process\\.env\\.${flag} \\?\\? 'false'\\) === 'true'`);
  check(`${flag} defaults to false in committed config`, pattern.test(appConfig));
}

// FE #157 registers the transport seam; registration does NOT discharge the
// still-unmet durable-collector/privacy gate above. Runtime tests exercise actual
// release delivery, and this guard prevents a second unreviewed dispatcher.
//
// The declaration in src/utils/analytics.ts and the two comments that mention
// the seam are excluded: what matters is whether anything INVOKES it. Matching
// the bare name would flag the definition and assert the opposite of the claim.
const dispatcherInvocations = sourceFiles(join(repoRoot, 'src'))
  .flatMap((f) => readFileSync(f, 'utf8').split('\n'))
  .filter((line) => /setAnalyticsDispatcher\s*\(/.test(line))
  .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
  .filter((line) => !/\bfunction\s+setAnalyticsDispatcher\s*\(/.test(line));
check(
  `exactly the reviewed V3 transport is registered: ${JSON.stringify(dispatcherInvocations)}`,
  dispatcherInvocations.length === 1 && dispatcherInvocations[0].trim() === 'setAnalyticsDispatcher(transport.dispatch);',
);

const appSource = readFileSync(join(repoRoot, 'App.tsx'), 'utf8');
check('registration precedes App rendering', appSource.indexOf('installV3Analytics();') >= 0 &&
  appSource.indexOf('installV3Analytics();') < appSource.indexOf('export default function App'));

console.log(`v3RolloutDashboard: ${passed} checks passed`);
