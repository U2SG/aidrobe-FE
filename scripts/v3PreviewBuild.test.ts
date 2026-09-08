// Build-profile regression; no native build or network required.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const eas = JSON.parse(readFileSync(new URL('eas.json', root), 'utf8'));
function profile(name: string): any {
  const own = eas.build[name];
  if (!own) throw new Error('Unknown profile: ' + name);
  const parent = own.extends ? profile(own.extends) : {};
  return { ...parent, ...own, env: { ...parent.env, ...own.env }, android: { ...parent.android, ...own.android } };
}
function config(env: Record<string, string>): any {
  const module = { exports: {} as any };
  const code = ts.transpileModule(readFileSync(new URL('app.config.ts', root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    module, exports: module.exports, process: { env },
    require: (name: string) => {
      if (name === '@expo/config-plugins') return { withAndroidManifest: () => {}, AndroidConfig: {} };
      throw new Error('Unexpected build dependency: ' + name);
    },
  });
  return module.exports.default({ config: {} });
}
const v3 = profile('preview-v3');
assert.equal(v3.distribution, 'internal');
assert.equal(v3.environment, 'preview');
assert.equal(v3.developmentClient, false);
assert.equal(v3.android.buildType, 'apk');
assert.equal(v3.env.API_BASE_URL, profile('preview-v2').env.API_BASE_URL);
assert.equal(v3.env.APP_ENV, 'development');
const built = config({ ...v3.env, EAS_BUILD_GIT_COMMIT_HASH: 'source-fixture' });
assert.equal(built.version, '0.3.0');
assert.equal(built.android.versionCode, 7);
assert.equal(built.android.package, 'app.aidrobe.android');
assert.equal(built.extra.BUILD_SOURCE_COMMIT, 'source-fixture');
for (const flag of ['ENABLE_MVP_V2_UI', 'ENABLE_V3_PURCHASE_DECISION', 'ENABLE_V3_AVATAR', 'ENABLE_V3_STATIC_TRYON']) assert.equal(built.extra[flag], true, flag);
assert.equal(built.extra.ENABLE_V3_ANALYTICS, false);
for (const name of ['preview', 'preview-v2', 'production']) {
  const existing = config(profile(name).env);
  assert.equal(existing.version, '0.1.0');
  assert.equal(existing.android.versionCode, 6);
  for (const flag of ['ENABLE_V3_PURCHASE_DECISION', 'ENABLE_V3_AVATAR', 'ENABLE_V3_STATIC_TRYON', 'ENABLE_V3_ANALYTICS']) assert.equal(existing.extra[flag], false, name + ': ' + flag);
}
assert.equal(config(profile('production').env).extra.APP_ENV, 'production');
assert.equal(config(profile('production').env).android.usesCleartextTraffic, false);
assert.equal(config(profile('production').env).extra.BUILD_VARIANT, undefined);
const ignore = readFileSync(new URL('.easignore', root), 'utf8');
for (const rule of ['node_modules/', '.env*', '.git', '.claude/', '.agent-artifacts/', '*.keystore', 'credentials.json']) assert.ok(ignore.split(/\r?\n/).includes(rule), rule);
console.log('v3PreviewBuild: APK version, V3 flags, production defaults and upload exclusions passed');
