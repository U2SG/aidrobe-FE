import { isAnalyticsUuid, type V3AnalyticsSession } from './v3AnalyticsIdentity';
import { newFlowId, validateV3Event, V3_EVENT_SPECS, type V3EventName } from './v3AnalyticsEvents';

// Transport metadata is outside the frozen event properties. Keep the same ID
// and occurred_at across retries; collectors dedupe by environment + event_id.
export interface V3AnalyticsRecord {
  event_id: string;
  event_name: V3EventName;
  properties: Record<string, unknown>;
}
const ENVELOPE = new Set(['schema_version', 'occurred_at', 'platform', 'user_id', 'flow_id']);
export function validatedFeProperties(event: string, props: unknown, userId: string): Record<string, unknown> | null {
  try {
    const spec = V3_EVENT_SPECS[event as V3EventName];
    if (!spec || spec.owner !== 'fe' || !props || typeof props !== 'object' || Array.isArray(props)) return null;
    const input: Record<string, unknown> = Object.create(null);
    for (const [key, value] of Object.entries(props)) {
      if (!ENVELOPE.has(key) && !Object.prototype.hasOwnProperty.call(spec.fields, key)) return null;
      if (Array.isArray(value)) {
        if (value.length > 5) return null;
        const array: unknown[] = [];
        for (let i = 0; i < value.length; i += 1) array.push(value[i]);
        input[key] = array;
      } else input[key] = value;
    }
    if (input.schema_version !== 1 || !isAnalyticsUuid(input.user_id) || input.user_id !== userId) return null;
    if (input.platform !== 'ios' && input.platform !== 'android') return null;
    if (typeof input.occurred_at !== 'string' || input.occurred_at.length > 40 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(input.occurred_at) ||
      !Number.isFinite(Date.parse(input.occurred_at))) return null;
    if (input.flow_id !== undefined && !isAnalyticsUuid(input.flow_id)) return null;
    const payload: Record<string, unknown> = Object.create(null);
    for (const [key, value] of Object.entries(input)) {
      if (!ENVELOPE.has(key)) payload[key] = value;
      if (Array.isArray(value) && value.length > 5) return null;
    }
    if (validateV3Event(event as V3EventName, payload, input.flow_id as string | undefined)) return null;
    // Copy before enqueue: later mutation of a caller's object cannot leak data.
    const copy = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
    return JSON.stringify(copy).length <= 2048 ? copy : null;
  } catch { return null; }
}
export type DeliveryResult = { status: number; disabled?: boolean };
export interface AnalyticsTransportOptions {
  session: () => V3AnalyticsSession | null;
  send: (events: readonly V3AnalyticsRecord[], session: V3AnalyticsSession, signal: AbortSignal) => Promise<DeliveryResult>;
  enabled?: boolean;
  now?: () => number;
  pause?: (ms: number, signal: AbortSignal) => Promise<void>;
}
function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve(); };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
    if (signal.aborted) finish();
  });
}
export function createV3AnalyticsDispatcher(options: AnalyticsTransportOptions) {
  const now = options.now ?? Date.now;
  let enabled = options.enabled === true;
  let key: string | null = options.session()?.key ?? null;
  let epoch = 0;
  let queue: Array<{ record: V3AnalyticsRecord; at: number }> = [];
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> | null = null;
  const reset = () => {
    epoch += 1;
    queue = [];
    controller?.abort();
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const sessionChanged = () => {
    const next = options.session()?.key ?? null;
    if (next !== key) { reset(); key = next; }
  };
  const setEnabled = (value: boolean) => { enabled = value; if (!value) reset(); };
  const schedule = () => { if (timer === null && !running) timer = setTimeout(() => { timer = null; void flush(); }, 10); };
  const drain = async () => {
    while (enabled && queue.length) {
      sessionChanged();
      const session = options.session();
      if (!session || !queue.length) break;
      const batch = queue.splice(0, 8).filter((item) => now() - item.at <= 60_000);
      const oldest = batch[0];
      if (!oldest) continue;
      const currentEpoch = epoch;
      const abort = new AbortController();
      controller = abort;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        if (!enabled || currentEpoch !== epoch || session.key !== options.session()?.key ||
          now() - oldest.at > 60_000) break;
        let result: DeliveryResult = { status: 0 };
        try { result = await options.send(batch.map((item) => item.record), session, abort.signal); }
        catch { /* No payload logging, toast, token refresh or UI rejection. */ }
        if (currentEpoch !== epoch) break;
        if (result.disabled) { setEnabled(false); break; }
        if ((result.status >= 200 && result.status < 300) ||
          (result.status >= 400 && result.status < 500 && result.status !== 429)) break;
        if (attempt < 2) await (options.pause ?? pause)(250 * 2 ** attempt, abort.signal);
      }
      if (controller === abort) controller = null;
    }
  };
  const flush = (): Promise<void> => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (running) return running;
    running = drain().catch(() => { reset(); }).finally(() => {
      running = null;
      if (enabled && queue.length) schedule();
    });
    return running;
  };
  const dispatch = (event: string, props?: Record<string, unknown>): void => {
    sessionChanged();
    const session = options.session();
    if (!enabled || !session) return;
    const properties = validatedFeProperties(event, props, session.userId);
    if (!properties) return;
    if (queue.length === 32) queue.shift();
    queue.push({ record: { event_id: newFlowId(), event_name: event as V3EventName, properties }, at: now() });
    schedule();
  };
  return { dispatch, flush, sessionChanged, setEnabled, pendingCount: () => queue.length };
}
