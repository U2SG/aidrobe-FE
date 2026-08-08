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

export function currentV3FlowId(): string | null {
  return activeFlowId;
}

export { V3_FLOW_ID_HEADER };
