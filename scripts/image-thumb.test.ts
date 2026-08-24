// Regression coverage for FE#75 — shared media primitive (ImageThumb) fallback
// behavior for missing media and a failed media load.
//
// No jest/RNTL in this repo, and ImageThumb.tsx loads react-native at module
// scope, so the testable state logic lives in src/components/ui/imageThumbState.ts
// (import-free → loads cleanly under Node type-stripping). Relative path + explicit
// .ts extension (Node type-stripping does not resolve `@/` aliases).
// Run:  node scripts/image-thumb.test.ts   (Node >= 22 type-stripping)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import {
  imageThumbLoaderHandlers,
  imageThumbShowsPlaceholder,
  initialImageThumbState,
  type ImageThumbState,
} from '../src/components/ui/imageThumbState.ts';

let passed = 0;
function check(label: string, cond: boolean) {
  assert.ok(cond, label);
  passed += 1;
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p: string) => readFileSync(join(root, p), 'utf-8');

// Missing media: no uri/source ⇒ start empty, and the placeholder renders.
check('missing media starts in empty state', initialImageThumbState(false) === 'empty');
check('empty state shows the placeholder', imageThumbShowsPlaceholder('empty'));

// Present media: starts loading (skeleton), not the placeholder.
check('present media starts in loading state', initialImageThumbState(true) === 'loading');
check('loading state does not show the placeholder', !imageThumbShowsPlaceholder('loading'));

// Failed media load: falls back to the placeholder (icon / optional retry).
check('failed load shows the placeholder', imageThumbShowsPlaceholder('failed'));

// Loaded: the real image renders, never the placeholder.
check('loaded state does not show the placeholder', !imageThumbShowsPlaceholder('loaded'));

// --- FE#143: the loader callbacks must be referentially stable ---------------
//
// react-native-web's <Image> lists onLoadStart/onLoad/onError in its loader
// effect's dependency array (dist/exports/Image/index.js:262), so a fresh
// closure per render re-arms the effect and its setState schedules the next
// render. Measured in a browser over the same walk on both builds:
// 10,710 signed-URL image loads before vs 4 after, and 2,467 loads before vs 0
// after in a 6-second window with nobody touching the screen — plus 11 React
// "Maximum update depth exceeded" reports before, 0 after
// (.agent-artifacts/v3-025/driver-{before,after}.log).
//
// Two halves, because neither alone catches a regression. The runtime half
// pins WHAT the callbacks do; the source half pins that the component still
// holds them behind a dependency-free memo and passes them by reference —
// which is the part that actually stops the loop, and the part a refactor can
// silently undo without any test noticing.

// Runtime: each callback maps to the state it is named for, so making them
// stable did not change the loading/loaded/error behavior.
const seenStates: ImageThumbState[] = [];
const handlers = imageThumbLoaderHandlers((next) => seenStates.push(next));
handlers.onLoadStart();
handlers.onLoad();
handlers.onError();
check(
  'the loader callbacks drive loading → loaded → failed',
  seenStates.join(',') === 'loading,loaded,failed',
);

// The memo owns the stability, not a module-level cache: two mounts must get
// their own closures, or one thumbnail's load would drive another's state.
const a = imageThumbLoaderHandlers(() => {});
const b = imageThumbLoaderHandlers(() => {});
check('each call returns its own handlers (no shared module-level cache)', a.onLoad !== b.onLoad);
// Within one call the three are distinct functions, i.e. really three handlers.
check(
  'the three handlers are distinct',
  new Set([a.onLoadStart, a.onLoad, a.onError]).size === 3,
);

// Source: the three props the <Image> receives must not be created during
// render. Checked against the TYPESCRIPT AST rather than by matching text.
//
// A text probe pinned one exact spelling — `useMemo(() => imageThumb-
// LoaderHandlers(setState), [])` plus a `loader.` prefix — which fails a
// semantically identical refactor (a useRef, a renamed local) while a genuinely
// unstable variant written a different way slips past. The property that
// actually stops the loop is structural, so assert the structure:
//
//   1. each attribute's value is a reference expression, never a function or a
//      call written inline at the call site;
//   2. the binding it resolves to is created once per mount — a useMemo /
//      useCallback with an EMPTY dependency array, a useRef, or a module-scope
//      constant. A dependency array with anything in it re-creates the
//      identities on that dependency's change and re-arms RNW's loader effect.
//
// `typescript` is already this repo's typecheck dependency, so this adds none.
const thumbRel = 'src/components/ui/ImageThumb.tsx';
const thumbSrc = read(thumbRel);
const sourceFile = ts.createSourceFile(
  thumbRel,
  thumbSrc,
  ts.ScriptTarget.Latest,
  /* setParentNodes */ true,
  ts.ScriptKind.TSX,
);

function walk(node: ts.Node, visit: (n: ts.Node) => void) {
  visit(node);
  node.forEachChild((child) => walk(child, visit));
}

/** The JSX <Image> that wires the loader. Found by tag name + attribute, so the
 *  header comment's prose mention of `<Image>` cannot be mistaken for it. */
let imageAttrs: ts.NodeArray<ts.JsxAttributeLike> | null = null;
walk(sourceFile, (n) => {
  const tag = ts.isJsxSelfClosingElement(n) ? n : ts.isJsxOpeningElement(n) ? n : null;
  if (!tag || tag.tagName.getText(sourceFile) !== 'Image') return;
  const has = (name: string) =>
    tag.attributes.properties.some(
      (p) => ts.isJsxAttribute(p) && p.name.getText(sourceFile) === name,
    );
  if (has('onLoad')) imageAttrs = tag.attributes.properties;
});
check('the <Image> element is locatable in the AST', imageAttrs !== null);

/** Resolve `foo` / `foo.bar` down to the root identifier name. */
function rootIdentifier(expr: ts.Expression): string | null {
  let e: ts.Expression = expr;
  while (ts.isPropertyAccessExpression(e)) e = e.expression;
  return ts.isIdentifier(e) ? e.text : null;
}

/** The variable declaration that introduces `name`, anywhere in the file. */
function declarationOf(name: string): ts.VariableDeclaration | null {
  let found: ts.VariableDeclaration | null = null;
  walk(sourceFile, (n) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === name) found = n;
  });
  return found;
}

/** Created once per mount? A hook with an empty dep array, a ref, or a
 *  module-scope binding. Anything else can change identity between renders. */
function isStablePerMount(decl: ts.VariableDeclaration | null): { ok: boolean; why: string } {
  if (decl === null) return { ok: false, why: 'no declaration found in this file' };
  const init = decl.initializer;
  if (init === undefined) return { ok: false, why: 'declared without an initializer' };
  // Module scope: not re-evaluated on render at all.
  const inComponent = (() => {
    let p: ts.Node | undefined = decl;
    while (p) {
      if (ts.isFunctionDeclaration(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p))
        return true;
      p = p.parent;
    }
    return false;
  })();
  if (!inComponent) return { ok: true, why: 'module-scope binding' };
  // `useRef(...).current` is as stable as `useRef(...)`; unwrap the access so a
  // legitimate refactor to that shape is not read as a per-render expression.
  const call = ts.isPropertyAccessExpression(init) ? init.expression : init;
  if (!ts.isCallExpression(call)) return { ok: false, why: 'built inline during render' };
  const init2 = call;
  const callee = init2.expression.getText(sourceFile);
  if (callee === 'useRef') return { ok: true, why: 'useRef' };
  if (callee === 'useMemo' || callee === 'useCallback') {
    const deps = init2.arguments[1];
    if (deps === undefined || !ts.isArrayLiteralExpression(deps))
      return { ok: false, why: `${callee} with no dependency array` };
    if (deps.elements.length !== 0)
      return { ok: false, why: `${callee} with ${deps.elements.length} dependency(ies)` };
    return { ok: true, why: `${callee} with an empty dependency array` };
  }
  return { ok: false, why: `initialized by ${callee}(), which runs every render` };
}

for (const prop of ['onLoadStart', 'onLoad', 'onError']) {
  const attr = (imageAttrs ?? []).find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText(sourceFile) === prop,
  );
  check(`<Image> passes ${prop}`, attr !== undefined);
  const init = attr?.initializer;
  const expr = init !== undefined && ts.isJsxExpression(init) ? init.expression : undefined;
  check(`<Image> ${prop} has an expression value`, expr !== undefined);
  if (expr === undefined) continue;

  check(
    `<Image> ${prop} is a reference, not a closure created at the call site`,
    !ts.isArrowFunction(expr) && !ts.isFunctionExpression(expr) && !ts.isCallExpression(expr),
  );

  const name = rootIdentifier(expr);
  check(`<Image> ${prop} resolves to a named binding`, name !== null);
  if (name === null) continue;

  const verdict = isStablePerMount(declarationOf(name));
  check(
    `<Image> ${prop} comes from a binding that is stable per mount (${verdict.why})`,
    verdict.ok,
  );
}

// eslint-disable-next-line no-console
console.log(`image-thumb: ${passed}/${passed} cases passed`);
