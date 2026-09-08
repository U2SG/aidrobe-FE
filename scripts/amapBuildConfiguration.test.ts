import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../modules/amap-location/app.plugin.js', import.meta.url), 'utf8');
function load(env: Record<string, string>) {
  const logs: string[] = []; const writes: unknown[][] = []; const module = { exports: {} as any };
  runInNewContext(source, { module, process: { env },
    console: { warn: (v: string) => logs.push(v), log: (v: string) => logs.push(v) },
    require: (name: string) => {
      assert.equal(name, '@expo/config-plugins');
      return { withAndroidManifest: (config: unknown, modify: (v: unknown) => unknown) => modify(config),
        AndroidConfig: { Manifest: { getMainApplicationOrThrow: (v: unknown) => v,
          addMetaDataItemToMainApplication: (...args: unknown[]) => writes.push(args) } } };
    },
  });
  return { run: () => module.exports({ modResults: {} }), logs, writes };
}
const missing = load({ EAS_BUILD: 'true', AIDROBE_BUILD_VARIANT: 'v3-preview' });
assert.throws(missing.run, /V3 preview requires AMAP_API_KEY/);
assert.equal(missing.writes.length, 0);
const whitespace = load({ EAS_BUILD: 'true', AIDROBE_BUILD_VARIANT: 'v3-preview', AMAP_API_KEY: '  ' });
assert.throws(whitespace.run, /AMAP_API_KEY/);
const fixture = 'synthetic-key-never-a-real-credential';
const ready = load({ EAS_BUILD: 'true', AIDROBE_BUILD_VARIANT: 'v3-preview', AMAP_API_KEY: ' ' + fixture + ' ' });
ready.run(); assert.equal(ready.writes.length, 1);
assert.equal(ready.writes[0][1], 'com.amap.api.v2.apikey'); assert.equal(ready.writes[0][2], fixture);
assert.ok(!ready.logs.join('').includes(fixture));
assert.ok(ready.logs.some(x => x.includes('configured')));
for (const env of [{}, { EAS_BUILD: 'true' }, { AIDROBE_BUILD_VARIANT: 'v3-preview' }]) {
  const unchanged = load(env); unchanged.run(); assert.equal(unchanged.writes.length, 0);
}
console.log('amapBuildConfiguration: 11 checks passed; native secret values are never logged');
