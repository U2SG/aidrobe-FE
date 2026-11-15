import type {
  AskBody, AskConversationMessage, AskHistoryEntry, AskItemRefSnapshot, AskTripIntent, DesignBrief, StylingState,
} from '../types/api';

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
  omittedMetadata?: { itemRefs: boolean; itemRefSnapshots: boolean; tripIntent: boolean; styling: boolean };
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
      previous.itemRefs = message.itemRefs ?? message.styling?.outfit.items.map((item) => item.id) ?? [];
      previous.itemRefSnapshots = message.itemRefSnapshots ?? [];
      previous.tripIntent = message.tripIntent ?? null;
      previous.omittedMetadata = {
        itemRefs: message.itemRefs === undefined && !message.styling,
        itemRefSnapshots: message.itemRefSnapshots === undefined,
        tripIntent: message.tripIntent === undefined,
        styling: message.styling === undefined && message.itemRefs === undefined,
      };
    }
  }
  return turns;
}

// Older servers omit this metadata. Fill only omitted fields; an explicit
// empty list or null from the live conversation must beat cached history.
export function enrichConversationTurns(turns: AskTurn[], history: AskHistoryEntry[]): AskTurn[] {
  const bySessionId = new Map(history.map((entry) => [entry.askSessionId, entry]));
  return turns.map((turn) => {
    const entry = turn.feedbackSessionId ? bySessionId.get(turn.feedbackSessionId) : undefined;
    if (!entry || !turn.omittedMetadata) return turn;
    const missing = turn.omittedMetadata;
    const itemRefs = missing.itemRefs ? entry.itemRefs : turn.itemRefs;
    return {
      ...turn,
      itemRefs,
      itemRefSnapshots: missing.itemRefSnapshots
        ? entry.itemRefSnapshots.filter((snapshot) => itemRefs.includes(snapshot.itemId)) : turn.itemRefSnapshots,
      tripIntent: missing.tripIntent ? entry.tripIntent : turn.tripIntent,
      styling: missing.styling ? entry.styling : turn.styling,
    };
  });
}

// An idempotent retry can return an earlier successful version after a later edit.
export function newestStyling(current: StylingState | null, incoming: StylingState | null): StylingState | null {
  if (!incoming) return current;
  return current?.conversationId === incoming.conversationId && current.revision > incoming.revision
    ? current : incoming;
}

export function newestDesignBrief(current: DesignBrief | null, incoming: DesignBrief | null): DesignBrief | null {
  if (!incoming) return current;
  return current && current.revision > incoming.revision ? current : incoming;
}

export function stylingDesignBrief(styling: StylingState): DesignBrief {
  return { revision: styling.revision, constraints: styling.constraints, needsOutfitUpdate: false };
}

export function askConversationStorageKey(
  server: string, userId: string | null, scope: string, focusedItemId?: string, baseOutfitId?: string,
): string | null {
  return userId
    ? 'aidrobe.ask.' + JSON.stringify([server, userId, scope, focusedItemId ?? null, baseOutfitId ?? null])
    : null;
}
