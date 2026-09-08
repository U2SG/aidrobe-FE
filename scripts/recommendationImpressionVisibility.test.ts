// FE #161 review: hidden cache updates must not consume impression dedupe.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const evaluate = (file: string, require: (id: string) => unknown): any => {
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: module.exports, require });
  return module.exports;
};
const dedupe = evaluate('src/hooks/recommendationImpressionDedupe.ts', () => { throw Error('Unexpected import'); });
const events: any[] = [];
let previous: unknown[] | undefined;
let seenChecks = 0;
const shouldEmit = dedupe.impressionDedupeStore.shouldEmit;
dedupe.impressionDedupeStore.shouldEmit = (key: string) => { seenChecks++; return shouldEmit(key); };
const hook = evaluate('src/hooks/useRecommendationImpression.ts', (id) => {
  if (id === 'react') return { useEffect: (effect: () => void, dependencies: unknown[]) => {
    const changed = !previous || dependencies.some((dep, i) => !Object.is(previous?.[i], dep));
    previous = dependencies;
    if (changed) effect();
  }};
  if (id === '@/api/events') return { emitRecommendationEvent: (event: unknown) => events.push(event) };
  if (id === '@/hooks/recommendationImpressionDedupe') return dedupe;
  throw Error('Unexpected import: ' + id);
}).useRecommendationImpression;
const base = { recommendationId: 'rec-1', revision: 1, outfitId: 'outfit-1', sourceSurface: 'today', isVisible: false };
hook(base); hook({ ...base, revision: 2 });
assert.equal(events.length, 0, 'hidden initial load and cache update do not emit');
assert.equal(seenChecks, 0, 'hidden state does not consume ANY dedupe key');
hook({ ...base, revision: 2, isVisible: true });
assert.equal(events.length, 1, 'first focus emits the current revision');
assert.equal(events[0].metadata.revision, 2, 'no impression fabricated for the old hidden revision');
hook({ ...base, revision: 2, isVisible: true });
assert.equal(events.length, 1, 'visible rerender stays deduped');
hook({ ...base, revision: 3 });
assert.equal(events.length, 1, 'another hidden cache update stays silent');
hook({ ...base, revision: 3, isVisible: true });
assert.equal(events.length, 2, 'returning to the newly visible revision emits once');
hook({ ...base, revision: 3 }); hook({ ...base, revision: 3, isVisible: true });
assert.equal(events.length, 2, 'tab or stack refocus does not duplicate the same revision');
hook({ ...base, recommendationId: null, isVisible: true });
assert.equal(events.length, 2, 'legacy identity still emits nothing');
const screen = source('src/screens/today-v2/TodayV2Screen.tsx');
assert.ok(screen.includes('const isFocused = useIsFocused();') && screen.includes('isVisible: isFocused,'), 'Today forwards actual navigation focus');
console.log('recommendationImpressionVisibility: 10 checks passed');
