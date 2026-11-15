import { apiGet, apiPost } from './client';
import { toOutfit } from './recommendations';
import { toAskMetadata } from './askMetadata';
import type {
  AskConversation, DesignBrief, ServerAskItemRefSnapshot, ServerAskTripIntent,
  ServerDesignBrief, ServerLinkedDesignResult, ServerStylingConstraints, ServerStylingResponse, StylingConstraints, StylingState,
} from '@/types/api';

function toConstraints(data: ServerStylingConstraints): StylingConstraints {
  return {
    lockedItemIds: data.locked_item_ids ?? [],
    excludedItemIds: data.excluded_item_ids ?? [],
    goal: data.goal ?? null,
    notes: data.notes ?? [],
    targetStyle: data.target_style ?? null,
    exploration: data.exploration ?? false,
    targetDate: data.target_date ?? null,
    referenceInspirationId: data.reference_inspiration_id ?? null,
  };
}

export function toDesignBrief(data: ServerDesignBrief): DesignBrief {
  return { revision: data.revision, constraints: toConstraints(data.constraints), needsOutfitUpdate: data.needs_outfit_update };
}

export function toStyling(data: ServerStylingResponse): StylingState {
  return {
    conversationId: data.conversation_id,
    revision: data.revision,
    status: data.status,
    outfit: toOutfit(data.outfit),
    constraints: toConstraints(data.constraints),
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
    design_brief?: ServerDesignBrief | null;
    messages: Array<{
      id: string;
      ask_session_id?: string | null;
      role: string;
      content: string;
      created_at: string;
      styling?: ServerStylingResponse | null;
      design_brief?: ServerDesignBrief | null;
      item_refs?: string[];
      item_ref_snapshots?: ServerAskItemRefSnapshot[];
      trip_intent?: ServerAskTripIntent | null;
      linked_result?: ServerLinkedDesignResult | null;
    }>;
  }>('/v1/ask/conversations/' + conversationId, undefined, { silentErrorToast: true });
  return {
    conversationId: data.conversation_id,
    title: data.title,
    styling: data.styling ? toStyling(data.styling) : null,
    designBrief: data.design_brief ? toDesignBrief(data.design_brief) : null,
    messages: data.messages.map((message) => {
      const metadata = toAskMetadata(message);
      return {
        id: message.id,
        askSessionId: message.ask_session_id,
        role: message.role,
        content: message.content,
        createdAt: message.created_at,
        styling: message.styling === undefined ? undefined : message.styling ? toStyling(message.styling) : null,
        designBrief: message.design_brief ? toDesignBrief(message.design_brief) : null,
        itemRefs: message.item_refs,
        itemRefSnapshots: message.item_ref_snapshots === undefined ? undefined : metadata.itemRefSnapshots,
        tripIntent: message.trip_intent === undefined ? undefined : metadata.tripIntent,
        linkedResult: message.linked_result && ['purchase_decision', 'packing_list'].includes(message.linked_result.kind) ? {
          kind: message.linked_result.kind as 'purchase_decision' | 'packing_list',
          resourceId: message.linked_result.resource_id,
          sourceRevision: message.linked_result.source_revision,
          summary: message.linked_result.summary,
        } : null,
      };
    }),
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
