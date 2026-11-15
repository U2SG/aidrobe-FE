import type { AskBody, AskConversationMessage, AskItemRefSnapshot, AskTripIntent, StylingState } from '../types/api';

export interface AskTurn {
  id: string;
  question: string;
  answer: string | null;
  itemRefs: string[];
  itemRefSnapshots: AskItemRefSnapshot[];
  pending: boolean;
  failed?: boolean;
  conflict?: boolean;
  appliedConstraints?: string[];
  tripIntent?: AskTripIntent | null;
  feedback?: 'like' | 'dislike';
  feedbackSessionId?: string;
  styling?: StylingState | null;
  requestBody?: AskBody;
}

// Message IDs are not AskSession IDs: restored messages must not use them for feedback.
export function conversationTurns(messages: AskConversationMessage[], fallback: string): AskTurn[] {
  const turns: AskTurn[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      turns.push({
        id: message.id, question: message.content, answer: fallback,
        itemRefs: [], itemRefSnapshots: [], pending: false,
      });
    } else if (message.role === 'assistant') {
      const previous = turns[turns.length - 1];
      if (!previous) continue;
      previous.answer = message.content;
      previous.styling = message.styling;
      previous.feedbackSessionId = message.askSessionId ?? undefined;
      previous.itemRefs = message.styling?.outfit.items.map((item) => item.id) ?? [];
    }
  }
  return turns;
}

// An idempotent retry can return an earlier successful version after a later edit.
export function newestStyling(current: StylingState | null, incoming: StylingState | null): StylingState | null {
  if (!incoming) return current;
  return current?.conversationId === incoming.conversationId && current.revision > incoming.revision
    ? current : incoming;
}

export function askConversationStorageKey(
  server: string, userId: string | null, scope: string, focusedItemId?: string, baseOutfitId?: string,
): string | null {
  return userId
    ? 'aidrobe.ask.' + JSON.stringify([server, userId, scope, focusedItemId ?? null, baseOutfitId ?? null])
    : null;
}
