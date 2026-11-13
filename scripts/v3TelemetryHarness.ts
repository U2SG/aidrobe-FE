// Test-only loader: execute shipped TypeScript with native/config I/O replaced.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

export const USER = '00000000-0000-4000-8000-000000000157';
export const OTHER = '00000000-0000-4000-8000-000000000158';
export const FLOWS = [
  '00000000-0000-4000-8000-000000000161',
  '00000000-0000-4000-8000-000000000162',
  '00000000-0000-4000-8000-000000000163',
] as const;
export const token = (user = USER) => 'fixture.' + Buffer.from(JSON.stringify({ sub: user })).toString('base64url') + '.signature';
export const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 35));
export function store(initial: Record<string, unknown>) {
  let value = initial;
  const subscribers: Array<() => void> = [];
  return Object.assign((selector: (state: typeof value) => unknown) => selector(value), {
    getState: () => value,
    subscribe: (fn: () => void) => { subscribers.push(fn); return () => {}; },
    set: (next: Record<string, unknown>) => { value = { ...value, ...next }; for (const fn of subscribers) fn(); },
    subscribers,
  });
}
export function harness(options: { platform?: string; enabled?: boolean; accessToken?: string | null; production?: boolean; fetch?: (...args: any[]) => Promise<any> } = {}) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const auth = store({ accessToken: options.accessToken === undefined ? token() : options.accessToken });
  const dev = store({ userId: OTHER });
  const requests: Array<{ url: string; config: any }> = [];
  const logs: unknown[][] = [];
  let flow: string | null = FLOWS[0];
  const overrides: Record<string, unknown> = {
    'react': { useCallback: (fn: () => unknown) => fn },
    'react-native': { Platform: { OS: options.platform ?? 'ios' } },
    '@/api/client': { API_BASE_URL: 'https://api.fixture.invalid', APP_ENV: options.production === false ? 'development' : 'production' },
    '@/api/v3Flow': { currentV3FlowId: () => flow },
    '@/lib/featureFlags': { enableV3Analytics: options.enabled ?? true },
    '@/store/auth': { useAuthStore: auth },
    '@/store/devUser': { useDevUserStore: dev },
  };
  const cache = new Map<string, any>();
  function load(name: string, parent = root): any {
    if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name];
    let file = name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(parent, name);
    if (!existsSync(file)) file += '.ts';
    if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) throw new Error('Outside test root: ' + file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, require: (child: string) => load(child, dirname(file)),
      __DEV__: false, Date, setTimeout, clearTimeout, AbortController,
      console: { log: (...args: unknown[]) => logs.push(args), warn: (...args: unknown[]) => logs.push(args) },
      fetch: async (url: string, config: any) => {
        requests.push({ url, config });
        return options.fetch ? options.fetch(url, config) : { status: 202, headers: { get: () => null } };
      },
    }, { filename: file });
    return module.exports;
  }
  return { load, auth, dev, requests, logs, setFlow: (id: string | null) => { flow = id; } };
}
