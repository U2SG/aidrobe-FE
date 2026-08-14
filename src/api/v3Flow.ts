// V3-008 — the flow-correlation holder V3-002 promised ("V3-008 must add the
// interceptor"). One flow = one "should I buy this" attempt: a screen calls
// `beginV3Flow()` at flow start, the client interceptor stamps the id onto
// every request until `endV3Flow()`, and BE-emitted analytics join the same
// `flow_id` through the existing `X-Correlation-Id` middleware — no API shape
// change (V3-002 contract, transport decision).

import { newFlowId, V3_FLOW_ID_HEADER } from '@/utils/v3AnalyticsEvents';

let activeFlowId: string | null = null;

export function beginV3Flow(): string {
  activeFlowId = newFlowId();
  return activeFlowId;
}

export function endV3Flow(): void {
  activeFlowId = null;
}

/**
 * V3-010 — re-adopt a flow id that this client generated earlier, instead of
 * opening a new one.
 *
 * The one caller is the decision card returning from the existing-item
 * alternative hand-off (§4.2's 回流动作): the attempt is the same attempt, so
 * its later `v3_decision_action` emits must join the SAME `flow_id` — a new id
 * would split one user intent across two flows on the V3-002 dashboard, and no
 * id at all fails `flow_id: required` validation outright.
 *
 * Deliberately NOT a general "reopen": adopting on every screen focus would
 * stamp a stale correlation id onto unrelated requests, which is exactly the
 * leak V3-009 closed by ending the flow on blur.
 */
export function adoptV3Flow(flowId: string): void {
  activeFlowId = flowId;
}

export function currentV3FlowId(): string | null {
  return activeFlowId;
}

export { V3_FLOW_ID_HEADER };
