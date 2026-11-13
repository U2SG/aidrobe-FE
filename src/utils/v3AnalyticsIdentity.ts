/** Identity only, NOT token verification; the ingestion API authenticates again. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isAnalyticsUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function accessTokenSubject(token: string): string | null {
  // No Buffer/atob dependency: this also runs in the native JS runtime.
  try {
    if (token.length > 8192) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[2]) return null;
    const encoded = parts[1];
    if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let bits = 0, value = 0, escaped = '';
    for (const char of encoded) {
      value = (value << 6) | alphabet.indexOf(char);
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        escaped += '%' + ((value >> bits) & 255).toString(16).padStart(2, '0');
      }
    }
    const payload: unknown = JSON.parse(decodeURIComponent(escaped));
    if (!payload || typeof payload !== 'object' || !('sub' in payload)) return null;
    return isAnalyticsUuid(payload.sub) ? payload.sub.toLowerCase() : null;
  } catch { return null; }
}

export interface V3AnalyticsSession {
  userId: string;
  /** Opaque in-memory lifecycle key. Never serialized, persisted or logged. */
  key: string;
  headers: Readonly<Record<string, string>>;
}
export function analyticsSession(
  accessToken: string | null, devUserId: string | null, production: boolean,
): V3AnalyticsSession | null {
  if (accessToken) {
    const userId = accessTokenSubject(accessToken);
    return userId ? { userId, key: accessToken, headers: { Authorization: 'Bearer ' + accessToken } } : null;
  }
  if (production || !isAnalyticsUuid(devUserId)) return null;
  const userId = devUserId.toLowerCase();
  return { userId, key: 'dev:' + userId, headers: { 'X-User-Id': userId } };
}
