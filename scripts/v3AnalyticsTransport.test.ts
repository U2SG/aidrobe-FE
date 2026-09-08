import assert from 'node:assert/strict';
import { harness, USER, OTHER, FLOWS, token, settle } from './v3TelemetryHarness.ts';

let checks = 0;
const check = (condition: unknown, message: string) => { assert.ok(condition, message); checks++; };
const h = harness();
const identity = h.load('@/utils/v3AnalyticsIdentity');
const pure = h.load('@/utils/v3AnalyticsTransport');
const registry = h.load('@/utils/v3AnalyticsEvents');
const props = () => ({ schema_version: 1, occurred_at: new Date().toISOString(), platform: 'ios', user_id: USER, flow_id: FLOWS[0], source_type: 'share_link' });
check(identity.analyticsSession(token(), OTHER, true).userId === USER, 'authenticated subject, not development ID');
check(identity.analyticsSession('malformed', OTHER, false) === null, 'bad token cannot fall back to development user');
check(identity.analyticsSession(null, OTHER, true) === null, 'production never uses a development user');
check(identity.analyticsSession(null, OTHER, false).userId === OTHER, 'explicit development identity remains supported');
check(identity.accessTokenSubject(token('not-a-uuid')) === null, 'invalid subject is not an analytics identity');
check(identity.accessTokenSubject('x.' + 'a'.repeat(9000) + '.y') === null, 'bounded token decode');
for (const key of [...registry.V3_FORBIDDEN_FIELD_NAMES, 'unexpected', 'constructor', '__proto__']) {
  const input = Object.assign(Object.create(null), props());
  Object.defineProperty(input, key, { enumerable: true, value: 'PRIVATE_VALUE_DO_NOT_LOG' });
  check(pure.validatedFeProperties('v3_decision_started', input, USER) === null, 'deny: ' + key);
}
for (const bad of [
  { user_id: OTHER }, { platform: 'web' }, { schema_version: true }, { occurred_at: 'https://private.invalid' },
  { flow_id: 'private free text' }, { source_type: 'https://private.invalid' }, { source_type: { value: 'share_link' } },
]) check(pure.validatedFeProperties('v3_decision_started', { ...props(), ...bad }, USER) === null, 'bad envelope/payload rejected');
const inherited = Object.assign(Object.create({ toJSON: () => ({ email: 'PRIVATE_VALUE_DO_NOT_LOG' }) }), props());
check(pure.validatedFeProperties('v3_decision_started', inherited, USER).source_type === 'share_link', 'inherited toJSON cannot rewrite outbound data');
check(pure.validatedFeProperties('v3_decision_completed', props(), USER) === null, 'client cannot emit backend outcome');
check(pure.validatedFeProperties('ask_sent', { question: 'PRIVATE_VALUE_DO_NOT_LOG' }, USER) === null, 'legacy free-text events not exported');

let owner: any = identity.analyticsSession(token(), OTHER, true);
let sends: any[] = [];
let count = 0;
const dispatcher = pure.createV3AnalyticsDispatcher({ enabled: true, session: () => owner,
  send: async (events: any[]) => { sends.push(JSON.parse(JSON.stringify(events))); return { status: ++count < 3 ? 503 : 202 }; },
  pause: async () => {},
});
const mutable = props();
dispatcher.dispatch('v3_decision_started', mutable);
(mutable as any).email = 'PRIVATE_VALUE_DO_NOT_LOG';
mutable.source_type = 'order_image';
await dispatcher.flush();
check(sends.length === 3, 'retry count bounded to three');
check(sends.every((batch) => batch[0].event_id === sends[0][0].event_id), 'stable delivery ID across retries');
check(sends.every((batch) => batch[0].properties.occurred_at === sends[0][0].properties.occurred_at), 'original occurrence timestamp retained');
check(sends[0][0].properties.source_type === 'share_link' && !('email' in sends[0][0].properties), 'snapshot cannot be changed after enqueue');
let permanentCalls = 0;
const permanent = pure.createV3AnalyticsDispatcher({ enabled: true, session: () => owner,
  send: async () => { permanentCalls++; return { status: 401 }; }, pause: async () => {},
});
permanent.dispatch('v3_decision_started', props()); await permanent.flush();
check(permanentCalls === 1, 'unauthorized event is dropped without token refresh or retry');
let clock = 0;
sends = [];
const bounded = pure.createV3AnalyticsDispatcher({ enabled: true, session: () => owner, now: () => clock,
  send: async (events: any[]) => { sends.push(events); return { status: 202 }; },
});
for (let i = 0; i < 40; i++) bounded.dispatch('v3_decision_started', props());
check(bounded.pendingCount() === 32, 'bounded pending memory queue');
await bounded.flush();
check(sends.length === 4 && sends.every((batch) => batch.length === 8), 'bounded batches');
bounded.dispatch('v3_decision_started', props()); clock = 60001; await bounded.flush();
check(sends.length === 4, 'expired event never sent');
bounded.dispatch('v3_decision_started', props()); owner = null; bounded.sessionChanged(); await bounded.flush();
check(sends.length === 4, 'logout discards pending user data');
owner = identity.analyticsSession(token(), OTHER, true);
bounded.sessionChanged(); bounded.dispatch('v3_decision_started', props()); bounded.setEnabled(false); await bounded.flush();
check(sends.length === 4 && bounded.pendingCount() === 0, 'independent kill clears buffered events');
let sentSignal: AbortSignal | undefined;
let finish!: () => void;
let inFlightCalls = 0;
const inFlight = pure.createV3AnalyticsDispatcher({ enabled: true, session: () => owner,
  send: (_events: unknown, _owner: unknown, signal: AbortSignal) => {
    inFlightCalls++; sentSignal = signal;
    return new Promise((resolve) => { finish = () => resolve({ status: 503 }); });
  }, pause: async () => {},
});
inFlight.dispatch('v3_decision_started', props()); const flight = inFlight.flush();
owner = identity.analyticsSession(token(OTHER), USER, true); inFlight.sessionChanged(); finish(); await flight;
check(sentSignal?.aborted && inFlightCalls === 1, 'account switch aborts inflight and prevents old-account retry');

const runtime = h.load('@/utils/v3AnalyticsRuntime');
const analytics = h.load('@/utils/analytics');
runtime.installV3Analytics(); runtime.installV3Analytics();
check(h.auth.subscribers.length === 1 && h.dev.subscribers.length === 1, 'registration is idempotent');
check(runtime.currentV3EventContext().userId === USER, 'runtime gets real login identity');
analytics.trackV3('v3_decision_started', { source_type: 'share_link' }, runtime.currentV3EventContext());
analytics.track('ask_sent', { question: 'PRIVATE_VALUE_DO_NOT_LOG' });
analytics.track('v3_decision_completed', props());
analytics.trackV3('v3_decision_started', { source_type: 'share_link', email: 'PRIVATE_VALUE_DO_NOT_LOG' }, runtime.currentV3EventContext());
await settle();
check(h.requests.length === 1, 'release-mode real dispatcher reaches HTTP exactly once');
const payload = JSON.parse(h.requests[0].config.body);
check(payload.events.length === 1 && payload.events[0].event_name === 'v3_decision_started', 'only FE allowlisted record crosses HTTP boundary');
check(h.requests[0].config.headers.Authorization === 'Bearer ' + token(), 'credential captured for same subject');
check(!h.requests[0].config.body.includes('PRIVATE_VALUE_DO_NOT_LOG'), 'private content absent from wire');
check(!JSON.stringify(h.logs).includes('PRIVATE_VALUE_DO_NOT_LOG'), 'private content absent from logs');
check(h.requests[0].config.redirect === 'error', 'collector redirection cannot leak auth');
analytics.trackV3('v3_decision_started', { source_type: 'share_link' }, runtime.currentV3EventContext());
h.auth.set({ accessToken: null }); await settle();
check(h.requests.length === 1 && runtime.currentV3EventContext() === null, 'runtime subscription discards pending records at logout');
const bound = harness();
const { useV3EventContext } = bound.load('@/hooks/useV3EventContext');
const oldCallback = useV3EventContext();
check(oldCallback().userId === USER, 'hook initially binds the authenticated session');
bound.auth.set({ accessToken: token(OTHER) });
check(oldCallback() === null, 'old asynchronous callbacks cannot be attributed to the next account');
check(useV3EventContext()().userId === OTHER, 'new callbacks use the new authenticated session');
const web = harness({ platform: 'web' });
check(web.load('@/utils/v3AnalyticsRuntime').currentV3EventContext() === null, 'web is never mislabeled as ios');
const disabled = harness({ enabled: false });
const offRuntime = disabled.load('@/utils/v3AnalyticsRuntime'); offRuntime.installV3Analytics();
disabled.load('@/utils/analytics').trackV3('v3_decision_started', { source_type: 'share_link' }, offRuntime.currentV3EventContext());
await settle(); check(disabled.requests.length === 0, 'default-off release configuration sends nothing');
const killed = harness({ fetch: async () => ({ status: 503, headers: { get: () => '1' } }) });
const killRuntime = killed.load('@/utils/v3AnalyticsRuntime'); killRuntime.installV3Analytics();
const emit = () => killed.load('@/utils/analytics').trackV3('v3_decision_started', { source_type: 'share_link' }, killRuntime.currentV3EventContext());
emit(); await settle(); emit(); await settle();
check(killed.requests.length === 1, 'server kill stops collection independently of V3 product flags');
console.log('v3AnalyticsTransport: ' + checks + ' privacy, identity, delivery and release-wiring checks passed');
