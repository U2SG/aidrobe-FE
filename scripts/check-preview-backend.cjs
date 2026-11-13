// Read-only phone-backend preflight. Never starts Docker, migrates data or calls providers.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const hash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function readBounded(response) {
  if (!response.body) throw new Error('Missing response');
  const reader = response.body.getReader(); const chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 2 * 1024 * 1024) throw new Error('Response exceeds preflight limit');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); }
}
async function probeBackend({ baseUrl, expectedOpenapi, request = fetch }) {
  const base = new URL(baseUrl);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error('Expected a credential-free backend base URL');
  }
  const results = [];
  for (const endpoint of ['/healthz', '/readyz', '/openapi.json']) {
    try {
      const response = await request(new URL(endpoint, base), { signal: AbortSignal.timeout(3500), redirect: 'error' });
      if (response.status !== 200) { results.push({ endpoint, ok: false, status: response.status }); continue; }
      const data = await readBounded(response);
      if (endpoint === '/openapi.json') {
        const actualHash = hash(data); const expectedHash = hash(expectedOpenapi);
        results.push({ endpoint, ok: actualHash === expectedHash, actualHash, expectedHash });
      } else results.push({ endpoint, ok: data.status === (endpoint === '/healthz' ? 'ok' : 'ready') });
    } catch { results.push({ endpoint, ok: false, reason: 'unreachable_or_invalid_response' }); }
  }
  return { apiBaseUrl: base.origin, ok: results.every(row => row.ok), results,
    limitation: 'Schema/health evidence only; not deployed-source, provider, worker or phone acceptance.' };
}
function resolveProfile(build, name, seen = new Set()) {
  if (!build[name] || seen.has(name)) throw new Error('Invalid build profile inheritance');
  seen.add(name); const own = build[name];
  const parent = own.extends ? resolveProfile(build, own.extends, seen) : {};
  return { ...parent, ...own, env: { ...parent.env, ...own.env } };
}
module.exports = { probeBackend, resolveProfile, hash };
if (require.main === module) {
  (async () => {
    const root = path.resolve(__dirname, '..');
    const profile = resolveProfile(JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8')).build, 'preview-v3');
    if (profile.env.APP_ENV !== 'development') throw new Error('This command only probes the configured development preview');
    const report = await probeBackend({ baseUrl: profile.env.API_BASE_URL,
      expectedOpenapi: JSON.parse(fs.readFileSync(path.join(root, 'docs/openapi.json'), 'utf8')) });
    console.log(JSON.stringify(report, null, 2)); process.exitCode = report.ok ? 0 : 1;
  })().catch(() => { console.error('Invalid preview preflight configuration'); process.exitCode = 2; });
}
