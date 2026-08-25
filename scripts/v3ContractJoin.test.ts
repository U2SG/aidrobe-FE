// V3-022 — the cross-repo contract test for the V3 surfaces that did not have
// one: avatar (§4.2) and static try-on preview (§6.1/§6.2).
//
// `purchaseDecisionContract.test.ts` (V3-008) already joins the §5.1/§5.3
// decision vocabularies to the mirrored OpenAPI, and `v3AnalyticsEvents.test.ts`
// (V3-002) joins the analytics MIRROR MODULE to the shared artifact. Between
// them, three things were still unjoined, and each is a way for the repos to
// drift without any test going red:
//
//   1. **The call sites.** Nothing checked that the URL a client actually
//      builds is a path the server actually serves. A renamed route, or a
//      client template edited by hand, would be caught by a 404 in a running
//      app and by nothing before that.
//   2. **The avatar and generation-status vocabularies.** The OpenAPI publishes
//      `AvatarProfileResponse.status` and `OutfitVisualAssetResponse.
//      generation_status` as free `string`s (deliberately — an unknown value
//      must degrade per §3, not fail schema validation), so the FE's lists
//      cannot be joined to the spec at all. They CAN be joined to
//      `docs/v3-analytics-events.json`, which is byte-identical in both repos
//      (`./init.sh contract` enforces that) and publishes both vocabularies.
//   3. **The poll loop's totality, against the server's own terminal set.**
//      `visualPreviewMapping.test.ts` asserts the classifier over literals it
//      declares itself. Here every terminal status the CONTRACT names is run
//      through the shipped classifier, so "the loop stops on everything the
//      server can end on" is checked against the server's list rather than
//      against a copy of it.
//
// Two tiers, the `boundaryCopyProvenance.test.ts` split:
//
//   A. ALWAYS, including FE CI (which has no BE checkout). Everything above:
//      the two in-repo cross-repo artifacts (`docs/openapi.json`,
//      `docs/v3-analytics-events.json`) are the server's side of the join.
//   B. WHEN THE WORKSPACE IS PRESENT. That the two artifacts really are the
//      BE's bytes, plus the §4.1 state machine at its source (the BE enum) and
//      the §6.2 lifecycle at its source (the BE contract doc) — neither of
//      which is published in any artifact the FE repo holds. Where the sibling
//      repo is absent this prints, by name, what it did not check.
//
// Run:  node scripts/v3ContractJoin.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AVATAR_STATUSES, AVATAR_SOURCE_TYPES } from '../src/api/avatarProfileMapping.ts';
import {
  PREVIEW_CONCERNS,
  PREVIEW_PENDING_STATUSES,
  classifyGenerationStatus,
  previewRequestBody,
} from '../src/api/visualPreviewMapping.ts';
import {
  PREVIEW_FEEDBACK_VERDICTS,
  previewFeedbackBody,
  previewFeedbackPath,
} from '../src/api/previewFeedbackMapping.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

let checks = 0;
const check = (label: string, fn: () => void) => {
  fn();
  checks += 1;
  console.log(`  ✓ ${label}`);
};

interface Schema {
  properties?: Record<string, { enum?: string[]; const?: unknown; type?: string }>;
  required?: string[];
  additionalProperties?: boolean;
}
interface Spec {
  paths: Record<
    string,
    Record<string, { parameters?: Array<{ name: string; in: string; required?: boolean }>; responses: Record<string, unknown>; requestBody?: unknown }>
  >;
  components: { schemas: Record<string, Schema> };
}

const spec = JSON.parse(readFileSync(join(repoRoot, 'docs', 'openapi.json'), 'utf8')) as Spec;
const events = JSON.parse(
  readFileSync(join(repoRoot, 'docs', 'v3-analytics-events.json'), 'utf8'),
) as {
  events: Record<string, { fields: Record<string, { values?: string[] }> }>;
};

const src = (relative: string) => readFileSync(join(repoRoot, 'src', relative), 'utf8');

// ---------------------------------------------------------------------------
console.log('A1. every V3 call site resolves to a declared operation');

/** The first argument of every `api{Get,Post,Delete,Patch}` call in a module,
 *  as written — template literal or plain string. Read from SOURCE rather than
 *  imported, because `src/api/*.ts` clients import the axios client at runtime
 *  and cannot be loaded in bare Node. */
function callSites(source: string): Array<{ method: string; template: string }> {
  const found: Array<{ method: string; template: string }> = [];
  const call = /api(Get|Post|Delete|Patch)(?:<[^>]*>)?\(\s*(?:`([^`]+)`|'([^']+)')/g;
  for (const match of source.matchAll(call)) {
    found.push({ method: match[1].toLowerCase(), template: match[2] ?? match[3] });
  }
  return found;
}

/** `/v1/a/${id}/b?x=1` → the spec path it must be, or null.
 *  Matched by shape (segment count + literal segments) rather than by
 *  interpolating a name, so a client variable called `assetId` still matches a
 *  spec parameter called `asset_id`. */
function resolveToSpecPath(template: string): string | null {
  const path = template.split('?')[0];
  const wanted = path.split('/');
  for (const candidate of Object.keys(spec.paths)) {
    const parts = candidate.split('/');
    if (parts.length !== wanted.length) continue;
    const same = parts.every((part, i) => {
      if (part.startsWith('{') && part.endsWith('}')) return /^\$\{[^}]+\}$/.test(wanted[i]);
      return part === wanted[i];
    });
    if (same) return candidate;
  }
  return null;
}

const V3_CLIENTS = [
  'api/avatarProfile.ts',
  'api/visualPreview.ts',
  'api/outfitVisual.ts',
  'api/purchaseDecisions.ts',
] as const;

const resolved: Array<{ file: string; method: string; template: string; path: string }> = [];
for (const file of V3_CLIENTS) {
  const source = src(file);
  for (const site of callSites(source)) {
    if (!site.template.startsWith('/v1/')) continue;
    check(`${file}: ${site.method.toUpperCase()} ${site.template}`, () => {
      const path = resolveToSpecPath(site.template);
      assert.ok(path, `no OpenAPI path matches ${site.template}`);
      assert.ok(
        spec.paths[path][site.method],
        `${path} exists but declares no ${site.method.toUpperCase()}`,
      );
      resolved.push({ file, method: site.method, template: site.template, path });
    });
  }
}

check('all four V3 client modules contributed at least one call site', () => {
  for (const file of V3_CLIENTS) {
    assert.ok(
      resolved.some((r) => r.file === file),
      `${file} produced no /v1/ call site — the extractor probably stopped matching`,
    );
  }
});

// The instrument's own non-vacuity. A resolver that matched everything would
// make all thirteen checks above pass for free, and a silently-broken extractor
// would make them pass by finding nothing (which the check above covers).
check('the resolver rejects a path the server does not declare', () => {
  assert.equal(resolveToSpecPath('/v1/not-a-real-surface/${id}'), null);
  assert.equal(resolveToSpecPath('/v1/avatar-profile/${id}'), null, 'segment count must matter');
  assert.equal(
    resolveToSpecPath('/v1/outfit-visual-assets/literal-not-a-param'),
    null,
    'a literal segment must not satisfy a path parameter',
  );
});

// The one path built by a helper rather than inline, so the extractor above
// cannot see it. Resolved through the exported function, which is the thing the
// screen actually calls.
check('previewFeedbackPath() resolves to the §6.1 feedback operation', () => {
  const path = resolveToSpecPath(previewFeedbackPath('${assetId}'));
  assert.equal(path, '/v1/outfit-visual-assets/{asset_id}/feedback');
  assert.ok(spec.paths[path!].post);
});

// ---------------------------------------------------------------------------
console.log('\nA2. the frozen vocabularies, against the shared cross-repo artifact');

const requested = events.events.v3_preview_requested.fields;
const feedback = events.events.v3_preview_feedback.fields;
const outcome = events.events.v3_preview_outcome.fields;

check('AVATAR_STATUSES == the §4.1 state machine the contract publishes', () => {
  assert.deepEqual([...AVATAR_STATUSES], requested.avatar_status.values);
});

check('PREVIEW_CONCERNS == §6.1\'s concern vocabulary', () => {
  assert.deepEqual([...PREVIEW_CONCERNS], requested.concern.values);
});

check('PREVIEW_FEEDBACK_VERDICTS == §6.1\'s verdict vocabulary', () => {
  assert.deepEqual([...PREVIEW_FEEDBACK_VERDICTS], feedback.verdict.values);
});

check('AVATAR_SOURCE_TYPES is the frozen §4.2 four, in contract order', () => {
  // No artifact publishes this one (no event carries a source type), so it is
  // pinned against the contract's own literal list. Tier B joins it to the BE
  // enum, which is where it is generated from.
  assert.deepEqual([...AVATAR_SOURCE_TYPES], [
    'ootd_photo',
    'outfit_import',
    'user_upload',
    'camera_capture',
  ]);
});

// ---------------------------------------------------------------------------
console.log('\nA3. the poll loop stops on every status the server can end on');

const TERMINAL = outcome.generation_status.values as string[];

check(`the contract's terminal set is the three §6.2 ends (${TERMINAL.join(', ')})`, () => {
  assert.deepEqual([...TERMINAL].sort(), ['failed', 'ready', 'rejected_by_quality_gate']);
});

check('every terminal status classifies as terminal — none of them keeps polling', () => {
  for (const status of TERMINAL) {
    const cls = classifyGenerationStatus(status);
    assert.notEqual(cls, 'pending', `${status} classifies as pending, so the loop would spin`);
    assert.equal(cls, status === 'ready' ? 'ready' : 'no_result', status);
  }
});

check('the two no-result terminals are indistinguishable to the screen (§6.2 rule)', () => {
  assert.equal(classifyGenerationStatus('failed'), classifyGenerationStatus('rejected_by_quality_gate'));
});

check('a status this build has never heard of degrades to no_result, not to pending', () => {
  // §3's version-skew rule, checked against a value that is deliberately not in
  // any vocabulary either repo holds.
  assert.equal(classifyGenerationStatus('rejected_by_a_gate_from_2027'), 'no_result');
  assert.equal(classifyGenerationStatus(''), 'no_result');
});

check('no pending status is also a terminal status', () => {
  for (const status of PREVIEW_PENDING_STATUSES) {
    assert.ok(!TERMINAL.includes(status), `${status} is in both sets`);
  }
});

// ---------------------------------------------------------------------------
console.log('\nA4. the request bodies the clients build satisfy the server schemas');

function schemaOf(path: string, method: string): Schema {
  const operation = spec.paths[path][method] as {
    requestBody: { content: Record<string, { schema: { $ref: string } }> };
  };
  const ref = operation.requestBody.content['application/json'].schema.$ref;
  return spec.components.schemas[ref.split('/').pop()!];
}

function satisfies(label: string, body: Record<string, unknown>, schema: Schema): void {
  const keys = Object.keys(body);
  const properties = schema.properties ?? {};
  assert.ok(
    keys.every((key) => key in properties),
    `${label}: sends a key the schema does not declare`,
  );
  assert.ok(
    (schema.required ?? []).every((key) => keys.includes(key)),
    `${label}: omits a required key`,
  );
  if (schema.additionalProperties === false) {
    // Nothing to do beyond the first assertion — stated so a reader knows the
    // "no extras" half is covered by it, given `extra="forbid"`.
    assert.equal(schema.additionalProperties, false);
  }
  for (const [key, value] of Object.entries(body)) {
    const property = properties[key];
    if (property.enum) {
      assert.ok(property.enum.includes(value as string), `${label}: ${key}=${value} is off-enum`);
    }
    if ('const' in property) {
      assert.equal(value, property.const, `${label}: ${key} must be the frozen constant`);
    }
  }
}

const CREATE_PATH = '/v1/wardrobe-decisions/{decision_id}/visual-preview';
const FEEDBACK_PATH = '/v1/outfit-visual-assets/{asset_id}/feedback';

check('previewRequestBody() satisfies VisualPreviewRequest, every concern', () => {
  const schema = schemaOf(CREATE_PATH, 'post');
  for (const concern of PREVIEW_CONCERNS) {
    satisfies(`create[${concern}]`, previewRequestBody(concern), schema);
  }
  // The frozen three keys and no more — a fourth would be a 422 at runtime.
  assert.deepEqual(Object.keys(previewRequestBody('overall')).sort(), [
    'concern',
    'consent',
    'view_type',
  ]);
});

check('previewFeedbackBody() satisfies PreviewFeedbackRequest, every verdict', () => {
  const schema = schemaOf(FEEDBACK_PATH, 'post');
  for (const verdict of PREVIEW_FEEDBACK_VERDICTS) {
    satisfies(`feedback[${verdict}]`, previewFeedbackBody(verdict), schema);
  }
});

check('the body validator rejects a smuggled key and a missing required one', () => {
  // Same non-vacuity argument as the resolver: a `satisfies` that accepted
  // anything would make the two checks above free.
  const schema = schemaOf(FEEDBACK_PATH, 'post');
  assert.throws(() =>
    satisfies('smuggled', { verdict: 'looks_like_me', comment: 'free text' }, schema),
  );
  assert.throws(() => satisfies('empty', {}, schema));
  assert.throws(() => satisfies('off-enum', { verdict: 'looks_ok_i_guess' }, schema));
});

check('omitting `aspects` is legal — the P0 surface never asked, and says so', () => {
  const schema = schemaOf(FEEDBACK_PATH, 'post');
  assert.ok('aspects' in (schema.properties ?? {}));
  assert.ok(!(schema.required ?? []).includes('aspects'));
  assert.ok(!('aspects' in previewFeedbackBody('looks_like_me')));
});

/** Structural validation of a whole response payload against a schema:
 *  required keys present, no undeclared keys, enums and consts respected, null
 *  only where an `anyOf` admits it, recursing through $ref'd objects and arrays
 *  of them. Deliberately not a full JSON-Schema implementation — it covers the
 *  drift this repo can actually produce (a hand-written fixture), and a partial
 *  checker that says which field is wrong beats a dependency. */
function violations(
  payload: Record<string, unknown>,
  schema: Schema,
  where = '',
): string[] {
  const found: string[] = [];
  type Node = { $ref?: string; anyOf?: Node[]; enum?: string[]; const?: unknown; type?: string; items?: Node; properties?: Record<string, Node>; required?: string[] };
  const resolve = (node?: Node): Node | undefined =>
    node?.$ref ? (spec.components.schemas[node.$ref.split('/').pop()!] as Node) : node;
  const nullable = (node?: Node) => (node?.anyOf ?? []).some((v) => v.type === 'null');
  const nonNull = (node?: Node) => (node?.anyOf ?? []).find((v) => v.type !== 'null') ?? node;

  for (const key of schema.required ?? []) {
    if (!(key in payload)) found.push(`${where}.${key} is required and absent`);
  }
  for (const [key, value] of Object.entries(payload)) {
    const declared = (schema.properties as Record<string, Node> | undefined)?.[key];
    if (!declared) {
      found.push(`${where}.${key} is not declared by the schema`);
      continue;
    }
    if (value === null) {
      if (!nullable(declared)) found.push(`${where}.${key} is null but not nullable`);
      continue;
    }
    const node = resolve(nonNull(declared));
    if (node?.enum && !node.enum.includes(value as string)) {
      found.push(`${where}.${key}=${JSON.stringify(value)} is off-enum`);
    }
    if (node && 'const' in node && value !== node.const) {
      found.push(`${where}.${key} must be ${JSON.stringify(node.const)}`);
    }
    if (node?.type === 'array' && Array.isArray(value)) {
      const items = resolve(nonNull(node.items));
      if (items?.properties) {
        value.forEach((entry, i) =>
          found.push(
            ...violations(entry as Record<string, unknown>, items as Schema, `${where}.${key}[${i}]`),
          ),
        );
      }
    } else if (node?.properties && typeof value === 'object') {
      found.push(...violations(value as Record<string, unknown>, node as Schema, `${where}.${key}`));
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
console.log('\nA4b. the shared fixtures are shapes the server can actually send');

// Why this belongs in a contract test rather than in the fixture file: those
// fixtures are what the regression suite asserts on AND what the browser
// evidence drivers render (V3-009's own note says so), so a fixture that has
// drifted from the schema turns into screenshots of a screen the backend cannot
// produce. Nothing validated them until this check — `purchaseDecisionContract.
// test.ts` pins the mapping's CONSTANTS against the spec, not the fixtures.
//
// Two fixtures are deliberately off-contract and stay that way; both are named
// here so that "off-contract" can never again mean "unnoticed":
//
//   · UNKNOWN_DECISION — the §3 version-skew case, whose whole job is to carry
//     values this build has never heard of.
//   · WORTH_ADDING_DECISION — `closet_comparison: null`. FOUND BY THIS CHECK.
//     The BE declares that field REQUIRED and NOT nullable
//     (`purchase_decisions.py: closet_comparison: ClosetComparisonModel`), so
//     today's server always sends the block. The client tolerating null is
//     correct and §3 requires it — nothing shipped is wrong — but the fixture's
//     own comment calls it "an optional layer", and server-side it is not one.
//     Left as-is deliberately: it is another feature's asset, four regression
//     files and two evidence drivers read it, and rewriting it inside V3-022
//     would be unrelated churn. Recorded instead, so the next reader knows it
//     is a skew shape rather than the happy path.
//     V3-027 UPDATE: a driver that needs a SENDABLE `worth_adding` now imports
//     `WORTH_ADDING_WITH_COMPARISON_DECISION` instead of grafting a block from
//     another verdict. This one keeps its null on purpose and stays skewed; the
//     new sibling is walked by this same check and must NOT appear in the list
//     below, which is what pins the two apart.
const INTENTIONAL_SKEW = new Set(['UNKNOWN_DECISION', 'WORTH_ADDING_DECISION']);

const fixtures = await import('./fixtures/purchaseDecisionFixtures.ts');
const fixtureSchema = (value: Record<string, unknown>): Schema | null => {
  if ('decision' in value) return spec.components.schemas.WardrobeDecisionResponse;
  if ('status' in value && 'parsed_item' in value) {
    return spec.components.schemas.PurchaseCandidateResponse;
  }
  return null;
};

const skewed: string[] = [];
let validatedFixtures = 0;
for (const [name, value] of Object.entries(fixtures)) {
  if (!value || typeof value !== 'object') continue;
  const schema = fixtureSchema(value as Record<string, unknown>);
  if (!schema) continue;
  validatedFixtures += 1;
  const problems = violations(value as Record<string, unknown>, schema, name);
  if (problems.length) skewed.push(`${name}: ${problems.join('; ')}`);
}

check(`every shared decision/candidate fixture was checked (${validatedFixtures} of them)`, () => {
  assert.ok(validatedFixtures >= 5, 'the fixture walk found almost nothing — did the export shape change?');
});

check('only the two documented fixtures diverge from the server schema', () => {
  const names = skewed.map((entry) => entry.split(':')[0]).sort();
  for (const entry of skewed) console.log(`      skew: ${entry}`);
  assert.deepEqual(names, [...INTENTIONAL_SKEW].sort());
});

// ---------------------------------------------------------------------------
console.log('\nA5. the flag gates and the §6.4 privacy boundary, as declared');

/** Contract §2: the three flags gate the NEW surfaces only. */
const GATED = [
  ['/v1/purchase-candidates', 'post'],
  ['/v1/purchase-candidates/{candidate_id}', 'get'],
  ['/v1/purchase-candidates/{candidate_id}/decision', 'post'],
  ['/v1/wardrobe-decisions/{decision_id}', 'get'],
  ['/v1/wardrobe-decisions/{decision_id}/visual-preview', 'post'],
  ['/v1/avatar-profile', 'get'],
  ['/v1/avatar-profile', 'delete'],
  ['/v1/outfit-visual-assets/{asset_id}/feedback', 'post'],
] as const;

check('every gated V3 surface advertises 503, so the self-hiding rule is honest', () => {
  for (const [path, method] of GATED) {
    assert.ok(
      spec.paths[path]?.[method]?.responses['503'],
      `${method.toUpperCase()} ${path} declares no 503`,
    );
  }
});

check('the M10 poll advertises NO 503 — §2 rule 4, asserted in the negative', () => {
  // The interesting direction: if this surface ever grew a flag gate, V2
  // outfit-board polling would break, and this is the cheapest place to see it.
  const poll = spec.paths['/v1/outfit-visual-assets/{asset_id}'].get;
  assert.ok(poll, 'the M10 poll is gone');
  assert.ok(!poll.responses['503'], 'the ungated M10 GET now declares a 503');
});

check('DELETE /v1/avatar-profile requires purge_derived, and the client always sends it', () => {
  const parameters = spec.paths['/v1/avatar-profile'].delete.parameters ?? [];
  const purge = parameters.find((p) => p.name === 'purge_derived');
  assert.ok(purge, 'purge_derived is not declared');
  assert.equal(purge!.in, 'query');
  assert.equal(purge!.required, true, '§4.2 gives it no default — the caller must choose');
  assert.ok(/purge_derived=\$\{[^}]+\}|purge_derived=(true|false)/.test(src('api/avatarProfile.ts')));
});

const PROVENANCE = ['provider', 'model_version', 'prompt_version', 'object_key'];

check('no V3 response schema the client reads carries pipeline provenance (§6.4)', () => {
  for (const name of [
    'AvatarProfileResponse',
    'OutfitVisualAssetResponse',
    'VisualPreviewResponse',
    'PreviewFeedbackResponse',
  ]) {
    const schema = spec.components.schemas[name];
    assert.ok(schema, `${name} is missing from the spec`);
    const leaked = PROVENANCE.filter((field) => field in (schema.properties ?? {}));
    assert.deepEqual(leaked, [], `${name} exposes ${leaked.join(', ')}`);
  }
});

// A signpost rather than a silent hole: the two status fields are free strings
// on purpose (§3 version-skew), which is exactly why A2 joined them to the
// analytics artifact. If a future BE release publishes the enums, this check
// starts comparing them directly instead of reporting the gap.
const statusFields: Array<[string, string, readonly string[]]> = [
  ['AvatarProfileResponse', 'status', AVATAR_STATUSES],
  ['OutfitVisualAssetResponse', 'generation_status', [...PREVIEW_PENDING_STATUSES, ...TERMINAL]],
];
for (const [schemaName, field, feList] of statusFields) {
  const property = spec.components.schemas[schemaName].properties?.[field];
  if (property?.enum) {
    check(`${schemaName}.${field} now publishes an enum — joined directly`, () => {
      assert.deepEqual([...property.enum!].sort(), [...feList].sort());
    });
  } else {
    console.log(
      `  ⊘ ${schemaName}.${field} is an unconstrained string in the spec (deliberate, §3) — ` +
        'joined via docs/v3-analytics-events.json in A2 instead',
    );
  }
}

// ---------------------------------------------------------------------------
console.log('\nB. the cross-repo half (workspace only)');

const WORKSPACE = new URL('../../', import.meta.url);
const BE = (relative: string) => fileURLToPath(new URL(`aidrobe-BE/${relative}`, WORKSPACE));
const BE_OPENAPI = BE('docs/openapi.json');
const BE_EVENTS = BE('docs/v3-analytics-events.json');
const BE_ENUMS = BE('app/common/enums.py');
const BE_CONTRACT = BE('docs/v3-p0-contract.md');

/** `class Name(StrEnum):` … `MEMBER = "value"`, in declaration order. */
function pythonEnumValues(source: string, className: string): string[] {
  const start = source.indexOf(`class ${className}(StrEnum):`);
  if (start < 0) return [];
  const rest = source.slice(start + 1);
  const end = rest.indexOf('\nclass ');
  const block = end < 0 ? rest : rest.slice(0, end);
  return [...block.matchAll(/^ {4}[A-Z_0-9]+ = "([a-z_0-9]+)"$/gm)].map((m) => m[1]);
}

if ([BE_OPENAPI, BE_EVENTS, BE_ENUMS, BE_CONTRACT].every((path) => existsSync(path))) {
  check('docs/openapi.json is the BE\'s bytes, not a re-authored copy', () => {
    assert.deepEqual(
      readFileSync(join(repoRoot, 'docs', 'openapi.json')),
      readFileSync(BE_OPENAPI),
    );
  });

  check('docs/v3-analytics-events.json is the BE\'s bytes (line endings normalized)', () => {
    const strip = (buffer: Buffer) => buffer.toString('utf8').replace(/\r/g, '');
    assert.equal(
      strip(readFileSync(join(repoRoot, 'docs', 'v3-analytics-events.json'))),
      strip(readFileSync(BE_EVENTS)),
    );
  });

  const enums = readFileSync(BE_ENUMS, 'utf8');

  check('AVATAR_STATUSES == the BE AvatarStatus enum, in order', () => {
    assert.deepEqual([...AVATAR_STATUSES], pythonEnumValues(enums, 'AvatarStatus'));
  });

  check('AVATAR_SOURCE_TYPES == the BE AvatarSourceType enum, in order', () => {
    assert.deepEqual([...AVATAR_SOURCE_TYPES], pythonEnumValues(enums, 'AvatarSourceType'));
  });

  check('the §6.2 lifecycle block names exactly the statuses the client classifies', () => {
    const contract = readFileSync(BE_CONTRACT, 'utf8');
    const heading = contract.indexOf('### 6.2');
    assert.ok(heading > 0, '§6.2 is gone from the contract');
    const fence = contract.slice(heading).split('```')[1] ?? '';
    const named = new Set(
      [...fence.matchAll(/\b(queued|processing|quality_check|ready|failed|rejected_by_quality_gate)\b/g)].map(
        (m) => m[1],
      ),
    );
    assert.deepEqual(
      [...named].sort(),
      [...new Set([...PREVIEW_PENDING_STATUSES, ...TERMINAL])].sort(),
    );
  });
} else {
  console.log('  ⊘ SKIPPED — no V3 workspace beside this repo, so these are NOT covered here:');
  console.log('      · docs/openapi.json is byte-identical to the BE artifact');
  console.log('      · docs/v3-analytics-events.json is byte-identical to the BE artifact');
  console.log('      · AVATAR_STATUSES / AVATAR_SOURCE_TYPES == the BE StrEnums');
  console.log('      · the BE contract §6.2 lifecycle names exactly the classified statuses');
  console.log(`      (looked for ${BE_OPENAPI})`);
  console.log('      Tier A above still joined every call site, vocabulary and body to the');
  console.log('      two cross-repo artifacts this repo carries.');
}

console.log(`\nv3ContractJoin: ${checks} checks passed`);
