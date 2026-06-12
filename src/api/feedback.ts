import { apiPost } from './client';
import type {
  FitFeedbackBody,
  FitFeedbackResult,
  ServerFitFeedbackResponse,
} from '@/types/api';

// Single per-item feedback. Prefer the bundle endpoint
// (`sendOutfitFeedbackBundle` in api/recommendations.ts) when submitting overall +
// per-item together — the bundle path is transactional.
export async function sendFitFeedback(body: FitFeedbackBody): Promise<FitFeedbackResult> {
  const data = await apiPost<ServerFitFeedbackResponse>('/v1/fit-feedback', {
    item_id: body.itemId,
    outfit_id: body.outfitId ?? null,
    feedback_type: body.feedbackType,
    scene: body.scene,
  });
  return {
    feedbackId: data.feedback_id,
    fitStatus: data.fit_status,
  };
}
