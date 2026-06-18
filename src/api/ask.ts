import { apiGet, apiPost } from './client';
import type {
  AskBody,
  AskHistoryEntry,
  AskResult,
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
  });
  return {
    askSessionId: data.ask_session_id,
    answer: data.answer,
    itemRefs: data.item_refs,
    tokensUsed: data.tokens_used,
  };
}

export async function getAskHistory(limit = 20, offset = 0): Promise<AskHistoryEntry[]> {
  const data = await apiGet<ServerAskHistoryItem[]>('/v1/ask/history', { limit, offset });
  return data.map((item) => ({
    askSessionId: item.ask_session_id,
    question: item.question,
    answer: item.answer ?? null,
    itemRefs: item.item_refs ?? [],
    createdAt: item.created_at,
  }));
}
