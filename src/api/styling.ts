import { apiGet, apiPost } from './client';
import { toOutfit } from './recommendations';
import type { AskConversation, ServerStylingResponse, StylingState } from '@/types/api';

export function toStyling(data: ServerStylingResponse): StylingState {
  return {
    conversationId: data.conversation_id,
    revision: data.revision,
    status: data.status,
    outfit: toOutfit(data.outfit),
    constraints: {
      lockedItemIds: data.constraints.locked_item_ids ?? [],
      excludedItemIds: data.constraints.excluded_item_ids ?? [],
      goal: data.constraints.goal ?? null,
      notes: data.constraints.notes ?? [],
      targetStyle: data.constraints.target_style ?? null,
      exploration: data.constraints.exploration ?? false,
      targetDate: data.constraints.target_date ?? null,
    },
    recommendationId: data.recommendation_id ?? null,
    recommendationRevision: data.recommendation_revision ?? null,
    recommendationDate: data.recommendation_date ?? null,
  };
}

export async function getAskConversation(conversationId: string): Promise<AskConversation> {
  const data = await apiGet<{
    conversation_id: string;
    title: string | null;
    styling: ServerStylingResponse | null;
    messages: Array<{
      id: string;
      ask_session_id?: string | null;
      role: string;
      content: string;
      created_at: string;
      styling?: ServerStylingResponse | null;
    }>;
  }>('/v1/ask/conversations/' + conversationId, undefined, { silentErrorToast: true });
  return {
    conversationId: data.conversation_id,
    title: data.title,
    styling: data.styling ? toStyling(data.styling) : null,
    messages: data.messages.map((message) => ({
      id: message.id,
      askSessionId: message.ask_session_id,
      role: message.role,
      content: message.content,
      createdAt: message.created_at,
      styling: message.styling ? toStyling(message.styling) : null,
    })),
  };
}

export async function adoptStyling(
  conversationId: string,
  expectedRevision: number,
  requestId: string,
  date?: string | null,
): Promise<StylingState> {
  const data = await apiPost<ServerStylingResponse>(
    '/v1/ask/conversations/' + conversationId + '/adopt',
    { request_id: requestId, expected_revision: expectedRevision, date: date ?? undefined },
    undefined,
    { silentErrorToast: true },
  );
  return toStyling(data);
}

export async function reviseOutfit(
  outfitId: string,
  itemId: string,
  replacementItemId: string,
  requestId: string,
): Promise<StylingState> {
  const data = await apiPost<ServerStylingResponse>(
    '/v1/recommendations/outfits/' + outfitId + '/revisions',
    { request_id: requestId, item_id: itemId, replacement_item_id: replacementItemId },
    undefined,
    { silentErrorToast: true },
  );
  return toStyling(data);
}
