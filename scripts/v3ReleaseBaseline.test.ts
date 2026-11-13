// FE #160: execute the shipped mapper without React Native, then guard the merge seams.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const source = (file: string) => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
let response: unknown;
const calls: unknown[][] = [];
const request = async (...args: unknown[]) => { calls.push(args); return response; };
const module = { exports: {} as Record<string, (...args: unknown[]) => Promise<any>> };
runInNewContext(ts.transpileModule(source('src/api/recommendations.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: module.exports, require: (id: string) => {
  if (id === './client') return { apiGet: request, apiPost: request, apiDelete: request };
  if (id === '@/utils/i18n') return { toI18nMessage: (value: unknown) => value };
  throw new Error('Unexpected dependency: ' + id);
}});
const api = module.exports;
const identity = { recommendation_id: 'rec-1', revision: 0, generated_at: '2026-09-08T00:00:00Z', generation_source: 'refresh', trace_id: 'trace-1' };
const outfit = { outfit_id: 'outfit-1', type: 'safe', title: 'fixture', reason: 'Existing structured explanation.', items: [] };
response = { ...identity, recommendation_date: '2026-09-08', status: 'ready', outfits: [outfit], mode: 'tomorrow', applied_context: { override_text: 'fixture', constraints: [] } };
const today = await api.getTodayRecommendation('commute', '2026-09-09');
assert.equal(today.recommendationId, identity.recommendation_id);
assert.equal(today.revision, 0);
assert.equal(today.generatedAt, identity.generated_at);
assert.equal(today.generationSource, identity.generation_source);
assert.equal(today.traceId, identity.trace_id);
assert.equal(today.mode, 'tomorrow');
assert.equal(today.outfits[0].reason, outfit.reason);
assert.equal(today.appliedContext.overrideText, 'fixture');
assert.equal((calls[0][1] as any).target_date, '2026-09-09');
const refreshed = await api.refreshTodayRecommendation('commute');
assert.equal(refreshed.recommendationId, identity.recommendation_id);
response = { recommendation_date: '2026-09-08', status: 'insufficient_items', outfits: [] };
const legacy = await api.getTodayRecommendation();
for (const key of ['recommendationId', 'revision', 'generatedAt', 'generationSource', 'traceId']) assert.equal(legacy[key], null);
response = { ...identity, state: 'single_outfit', feasible_outfit_count: 1, missing_slots: [], first_outfit: outfit, gate_failures: [] };
const first = await api.getFirstOutfitGate();
assert.equal(first.recommendationId, identity.recommendation_id);
assert.equal(first.revision, 0);
assert.equal(first.firstOutfit.id, 'outfit-1');
response = { state: 'no_outfit', feasible_outfit_count: 0, missing_slots: ['top'], first_outfit: null, gate_failures: [] };
const empty = await api.getFirstOutfitGate();
assert.equal(empty.recommendationId, null);
assert.equal(empty.firstOutfit, null);
// Both input modes survive this reconciliation, and navigation retains the type
// (only outfit_image may offer an independently consented avatar candidate).
const input = source('src/screens/wardrobe/AddItemScreen.tsx');
assert.ok(input.includes("handlePicked(asset.uri, 'album', 'outfit_image')"));
assert.ok(input.includes("handlePicked(result.assets[0].uri, 'album', 'order_screenshot')"));
assert.ok(input.includes("navigation.replace('ImportConfirm', { taskId: task.id, inputType });"));
assert.ok(input.includes('onShoppingScreenshot='));
const screen = source('src/screens/today-v2/TodayV2Screen.tsx');
for (const text of ['useRecommendationImpression({', 'override === undefined', '!identityUnchanged', 'setAppliedOverrideCaption(overrideLabel)', 'swapDisabled={serverTomorrowActive}', 'httpStatus(err)']) assert.ok(screen.includes(text), text);
console.log('v3ReleaseBaseline: mapper runtime and V3 integration seams passed');
