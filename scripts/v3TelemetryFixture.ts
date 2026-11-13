// Synthetic transport proof, not a native UI/device or real-provider test.
import assert from 'node:assert/strict';
// @ts-expect-error Node standalone type stripping requires the .ts extension.
import { harness, FLOWS, settle } from './v3TelemetryHarness.ts';
const h = harness();
const runtime = h.load('@/utils/v3AnalyticsRuntime'); runtime.installV3Analytics();
const { trackV3 } = h.load('@/utils/analytics');
let emitted = 0;
const emit = async (flow: string, event: string, fields: Record<string, unknown>) => {
  h.setFlow(flow); trackV3(event, fields, runtime.currentV3EventContext()); emitted++;
  await new Promise<void>((resolve) => setTimeout(resolve, 3));
};
const phase = process.argv[2];
if (phase === 'start') for (const flow of FLOWS) await emit(flow, 'v3_decision_started', { source_type: 'share_link' });
else if (phase === 'viewed') for (const [index, flow] of FLOWS.entries()) {
  await emit(flow, 'v3_decision_viewed', { decision: 'worth_adding' });
  if (index) await emit(flow, 'v3_preview_requested', { concern: 'overall', avatar_status: 'ready' });
}
else if (phase === 'terminal') for (const [index, flow] of FLOWS.entries()) {
  if (index) await emit(flow, 'v3_preview_viewed', { result: index === 1 ? 'shown' : 'fallback' });
  if (index === 1) await emit(flow, 'v3_preview_feedback', { verdict: 'looks_like_me' });
  await emit(flow, 'v3_decision_action', { action: 'style_with_existing' });
}
else throw new Error('Expected start, viewed or terminal phase');
await settle();
const batches = h.requests.map((request) => JSON.parse(request.config.body));
assert.equal(batches.reduce((count, batch) => count + batch.events.length, 0), emitted);
process.stdout.write(JSON.stringify(batches));
