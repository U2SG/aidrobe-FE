import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import axios from 'axios';
import ts from 'typescript';

import { sameRequestSession } from '../src/api/requestSession.ts';

// Execute the real client/store with only native storage, UI effects and HTTP replaced.
function fixture() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const disk = new Map<string, string>();
  const requests: any[] = [];
  const resets: unknown[] = [];
  let beforeWrite: ((key: string, value: string) => Promise<void>) | undefined;
  const overrides: Record<string, unknown> = {
    // These replacements already expose ES-module defaults; do not wrap them a second time.
    axios: { __esModule: true, default: axios },
    'expo-constants': { __esModule: true, default: { expoConfig: { extra: { APP_ENV: 'production' } } } },
    'expo-secure-store': {
      getItemAsync: async (key: string) => disk.get(key) ?? null,
      setItemAsync: async (key: string, value: string) => { await beforeWrite?.(key, value); disk.set(key, value); },
      deleteItemAsync: async (key: string) => { disk.delete(key); },
    },
    zustand: {
      create: (initialize: any) => {
        let state: any;
        const getState = () => state;
        state = initialize((next: object) => { state = { ...state, ...next }; }, getState);
        return { getState };
      },
    },
    '@/api/v3Flow': { currentV3FlowId: () => null, V3_FLOW_ID_HEADER: 'X-Test-Flow' },
    '@/core/providers/queryClient': { queryClient: { clear: () => resets.push('cache') } },
    '@/store/onboarding': { useOnboardingStore: { getState: () => ({ setCompleted: (value: boolean) => resets.push(value) }) } },
    '@/store/devUser': { useDevUserStore: { getState: () => ({ userId: null }) } },
    '@/store/toast': { useToastStore: { getState: () => ({ show: (value: unknown) => resets.push(value) }) } },
    '@/utils/deviceId': { getOrCreateDeviceId: async () => 'device' },
  };
  const modules = new Map<string, any>();
  function load(name: string, parent = root): any {
    if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name];
    const file = (name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(parent, name)) + '.ts';
    if (modules.has(file)) return modules.get(file).exports;
    const module = { exports: {} };
    modules.set(file, module);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, require: (child: string) => load(child, dirname(file)),
      Promise, console,
    }, { filename: file });
    return module.exports;
  }
  const client = load('@/api/client');
  const auth = load('@/store/auth').useAuthStore;
  const setAdapter = (respond: (config: any) => Promise<any>) => {
    client.apiClient.defaults.adapter = (config: any) => { requests.push(config); return respond(config); };
  };
  return { client, auth, disk, requests, resets, setAdapter, holdWrites: (fn: typeof beforeWrite) => { beforeWrite = fn; } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function until(ready: () => boolean) {
  for (let i = 0; i < 30 && !ready(); i++) await new Promise<void>((resolve) => setImmediate(resolve));
  assert.ok(ready(), 'expected asynchronous request reached its boundary');
}
const tokens = (value: string) => ({ access_token: value, refresh_token: value + '-refresh', token_type: 'bearer' });
const ok = (config: any, data: unknown) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const unauthorized = (config: any) => new axios.AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, {
  config, data: { message: 'Expired' }, status: 401, statusText: 'Unauthorized', headers: {},
});

assert.ok(sameRequestSession({ authVersion: 2, devUserId: null }, { authVersion: 2, devUserId: null }));
assert.ok(!sameRequestSession({ authVersion: 2, devUserId: null }, { authVersion: 4, devUserId: null }));
assert.ok(!sameRequestSession({ authVersion: 2, devUserId: 'a' }, { authVersion: 2, devUserId: 'b' }));

// Concurrent 401s share one refresh, retain the session, and preserve idempotency payloads.
{
  const h = fixture();
  await h.auth.getState().setTokens(tokens('a'));
  const sessionVersion = h.auth.getState().sessionVersion;
  const refresh = deferred<any>();
  h.setAdapter(async (config) => {
    if (config.url === '/v1/auth/refresh') return refresh.promise.then((value) => ok(config, value));
    if (!config._isRetry) throw unauthorized(config);
    return ok(config, { saved: true });
  });
  const body = { request_id: 'stable-request', question: 'Private wardrobe question' };
  const first = h.client.apiPost('/v1/ask', body);
  const second = h.client.apiPost('/v1/ask', { request_id: 'second-request' });
  await until(() => h.requests.some((request) => request.url === '/v1/auth/refresh'));
  refresh.resolve(tokens('a-rotated'));
  await Promise.all([first, second]);
  assert.equal(h.requests.filter((request) => request.url === '/v1/auth/refresh').length, 1);
  assert.equal(h.auth.getState().sessionVersion, sessionVersion, 'normal token rotation retains request identity');
  const firstAttempts = h.requests.filter((request) => request.url === '/v1/ask' && JSON.parse(request.data).request_id === 'stable-request');
  assert.equal(firstAttempts.length, 2);
  assert.equal(firstAttempts[0].data, firstAttempts[1].data, 'retry preserves the exact request body');
  assert.equal(firstAttempts[1].headers.get('Authorization'), 'Bearer a-rotated');
}

// A late 401 after logout/login cannot refresh or replay the old private question.
{
  const h = fixture();
  await h.auth.getState().setTokens(tokens('a'));
  const delayed = deferred<any>();
  h.setAdapter(() => delayed.promise);
  const pending = h.client.apiPost('/v1/ask', { question: 'A private question' }).catch((error: unknown) => error);
  await until(() => h.requests.length === 1);
  await h.auth.getState().clear();
  await h.auth.getState().setTokens(tokens('b'));
  delayed.reject(unauthorized(h.requests[0]));
  await pending;
  assert.equal(h.requests.length, 1, 'no old-account refresh or replay');
  assert.equal(h.auth.getState().accessToken, 'b');
  assert.equal(h.resets.length, 0);
}

// Either outcome of an old refresh is harmless to a new login, including the same account.
for (const success of [true, false]) {
  const h = fixture();
  await h.auth.getState().setTokens(tokens('a'));
  const refresh = deferred<any>();
  h.setAdapter(async (config) => {
    if (config.url === '/v1/auth/refresh') return refresh.promise.then((value) => ok(config, value));
    throw unauthorized(config);
  });
  const pending = h.client.apiPost('/v1/ask', { question: 'A private question' }).catch((error: unknown) => error);
  await until(() => h.requests.some((request) => request.url === '/v1/auth/refresh'));
  await h.auth.getState().clear();
  await h.auth.getState().setTokens(tokens(success ? 'b' : 'a-new-login'));
  if (success) refresh.resolve(tokens('a-late-refresh'));
  else refresh.reject(unauthorized(h.requests.find((request) => request.url === '/v1/auth/refresh')));
  await pending;
  const expected = success ? 'b' : 'a-new-login';
  assert.equal(h.auth.getState().accessToken, expected);
  assert.equal(h.disk.get('aidrobe.accessToken'), expected);
  assert.equal(h.resets.length, 0, 'old refresh failure cannot sign out the new session');
  assert.equal(h.requests.length, 2, 'old request is never replayed after the account boundary');
}

// Logout/new login also wins if refresh token persistence has already started.
{
  const h = fixture();
  await h.auth.getState().setTokens(tokens('a'));
  const gate = deferred<void>();
  let writing = false;
  h.holdWrites(async (_key, value) => { if (value === 'a-rotated') { writing = true; await gate.promise; } });
  const refresh = h.auth.getState().refreshTokens(tokens('a-rotated'), h.auth.getState().sessionVersion);
  await until(() => writing);
  const logout = h.auth.getState().clear();
  const login = h.auth.getState().setTokens(tokens('b'));
  gate.resolve();
  assert.equal(await refresh, false);
  await Promise.all([logout, login]);
  assert.equal(h.auth.getState().accessToken, 'b');
  assert.equal(h.disk.get('aidrobe.accessToken'), 'b');
  assert.equal(h.disk.get('aidrobe.refreshToken'), 'b-refresh');
}

// Late successful data is also fenced before a consumer can populate the next account's cache.
{
  const h = fixture();
  await h.auth.getState().setTokens(tokens('a'));
  const response = deferred<any>();
  h.setAdapter(() => response.promise);
  const pending = h.client.apiGet('/v1/ask/history').catch((error: unknown) => error);
  await until(() => h.requests.length === 1);
  await h.auth.getState().setTokens(tokens('b'));
  response.resolve(ok(h.requests[0], { private: 'A history' }));
  assert.ok(axios.isCancel(await pending));
}
