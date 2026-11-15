import { apiGet, apiPost } from './client';
import { toAskMetadata } from './askMetadata';
import { toDesignBrief, toStyling } from './styling';
import type {
  AskBody,
  AskHistoryEntry,
  AskResult,
  AskScope,
  ServerAskHistoryItem,
  ServerAskResponse,
} from '@/types/api';

// V4 M15 — natural-language Q&A over the user's wardrobe / outfit context.
export async function askAidrobe(body: AskBody): Promise<AskResult> {
  const data = await apiPost<ServerAskResponse>('/v1/ask', {
    question: body.question,
    context: body.context
      ? {
          date: body.context.date,
          scene: body.context.scene,
          time_left_minutes: body.context.timeLeftMinutes,
        }
      : null,
    focused_item_id: body.focusedItemId ?? null,
    locale: body.locale ?? null,
    conversation_id: body.conversationId ?? null,
    design_mode: body.designMode ?? false,
    request_id: body.requestId,
    expected_revision: body.expectedRevision ?? undefined,
    base_outfit_id: body.baseOutfitId,
    constraints: body.referenceInspirationId ? { reference_inspiration_id: body.referenceInspirationId } : undefined,
  }, undefined, { timeout: 60_000 });
  return {
    askSessionId: data.ask_session_id,
    conversationId: data.conversation_id ?? null,
    answer: data.answer,
    ...toAskMetadata(data),
    tokensUsed: data.tokens_used,
    hasWardrobeContext: data.has_wardrobe_context ?? false,
    deltas: data.deltas
      ? {
          reasoning: data.deltas.reasoning ?? null,
          appliedConstraints: data.deltas.applied_constraints ?? [],
        }
      : null,
    recommendationId: data.recommendation_id ?? null,
    sourceSurface: data.source_surface ?? 'ask',
    styling: data.styling ? toStyling(data.styling) : null,
    designBrief: data.design_brief ? toDesignBrief(data.design_brief) : null,
  };
}

export interface AskHistoryQuery {
  limit?: number;
  offset?: number;
  // When set, scopes history to one wardrobe item's Asks (FE#12). Without it,
  // the call returns global history.
  focusedItemId?: string;
  scope?: AskScope;
  entrypoint?: string;
}

export async function getAskHistory(query: AskHistoryQuery = {}): Promise<AskHistoryEntry[]> {
  const { limit = 20, offset = 0, focusedItemId, scope, entrypoint } = query;
  const params: Record<string, string | number> = { limit, offset };
  if (focusedItemId) params.focused_item_id = focusedItemId;
  if (scope) params.scope = scope;
  if (entrypoint) params.entrypoint = entrypoint;
  const data = await apiGet<ServerAskHistoryItem[]>('/v1/ask/history', params);
  return data.map((item) => ({
    askSessionId: item.ask_session_id,
    conversationId: item.conversation_id ?? null,
    question: item.question,
    answer: item.answer ?? null,
    ...toAskMetadata(item),
    createdAt: item.created_at,
    styling: item.styling ? toStyling(item.styling) : null,
    designBrief: item.design_brief ? toDesignBrief(item.design_brief) : null,
  }));
}

// FE#119 — rate an answered Ask turn. Values mirror the recommendation
// feedback vocabulary the BE maps onto recommendation events.
export function sendAskFeedback(askSessionId: string, kind: 'like' | 'dislike') {
  return apiPost<{ success: boolean }>(`/v1/ask/${askSessionId}/feedback`, {
    feedback_type: kind,
    reason_tags: [],
  });
}
