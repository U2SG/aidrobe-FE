import { apiDelete, apiGet, apiPost } from './client';
import type {
  CostSummary,
  DataExportResult,
  DeactivateResult,
  ServerCostSummary,
  ServerDataExportResponse,
  ServerDeactivateResponse,
} from '@/types/api';

// V3+ E1 — soft-delete with grace window. Idempotent.
// After this call all sessions are revoked; subsequent requests with the same
// JWT return 401 "Account deactivated". A re-login via Apple within
// grace_days auto-reactivates.
export async function deactivateAccount(): Promise<DeactivateResult> {
  const data = await apiDelete<ServerDeactivateResponse>('/v1/me');
  return {
    deactivatedAt: data.deactivated_at,
    scheduledPurgeAt: data.scheduled_purge_at,
    graceDays: data.grace_days,
  };
}

// V3+ E5 — async DSAR export. Idempotent per pending job.
export async function requestDataExport(): Promise<DataExportResult> {
  const data = await apiPost<ServerDataExportResponse>('/v1/me/data-export');
  return { jobId: data.job_id, status: data.status, message: data.message };
}

// V3+ E3 — daily quota usage. Always returns a payload (limit is the unused
// default when ENABLE_COST_GUARD is off, so the UI can pre-render).
export async function getCostSummary(): Promise<CostSummary> {
  const data = await apiGet<ServerCostSummary>('/v1/user/cost-summary');
  return {
    llmAsk: data.llm_ask,
    ocrReceipt: data.ocr_receipt,
    tryon: data.tryon,
  };
}
