import { apiGet, apiPost } from './client';
import type {
  AskBody,
  AskHistoryEntry,
  AskItemRefSnapshot,
  AskResult,
  AskScope,
  ServerAskHistoryItem,
  ServerAskItemRefSnapshot,
  ServerAskResponse,
} from '@/types/api';

function mapSnapshots(rows?: ServerAskItemRefSnapshot[]): AskItemRefSnapshot[] {
  return (rows ?? []).map((s) => ({
    itemId: s.item_id,
    name: s.name,
    category: s.category,
    colorMain: s.color_main,
    thumbnailUrl: s.thumbnail_url ?? null,
  }));
}

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
  });
  return {
    askSessionId: data.ask_session_id,
    answer: data.answer,
    itemRefs: data.item_refs,
    itemRefSnapshots: mapSnapshots(data.item_ref_snapshots),
    tokensUsed: data.tokens_used,
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
    question: item.question,
    answer: item.answer ?? null,
    itemRefs: item.item_refs ?? [],
    itemRefSnapshots: mapSnapshots(item.item_ref_snapshots),
    createdAt: item.created_at,
  }));
}
