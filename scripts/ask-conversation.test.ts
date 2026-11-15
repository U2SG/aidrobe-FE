import assert from 'node:assert/strict';
import { toAskMetadata } from '../src/api/askMetadata.ts';
import {
  askConversationStorageKey, conversationTurns, enrichConversationTurns, newestDesignBrief, newestStyling, stylingDesignBrief,
} from '../src/utils/askConversation.ts';
import type { StylingState } from '../src/types/api.ts';

const messages = [
  { id: 'tool', role: 'tool', content: 'ignored', createdAt: '', styling: null },
  { id: 'u1', role: 'user', content: 'First outfit', createdAt: '', styling: null },
  { id: 'a1', role: 'assistant', content: 'First answer', createdAt: '', styling: null },
  { id: 'u2', role: 'user', content: 'Only change the shoes', createdAt: '', styling: null },
];
const turns = conversationTurns(messages, 'No answer yet');
assert.deepEqual(turns.map((turn) => [turn.id, turn.question, turn.answer]), [
  ['u1', 'First outfit', 'First answer'], ['u2', 'Only change the shoes', 'No answer yet'],
]);
assert.ok(turns.every((turn) => turn.feedbackSessionId === undefined));
assert.equal(messages[1].content, 'First outfit');

const ordinaryMetadata = toAskMetadata({
  item_refs: ['shirt'],
  item_ref_snapshots: [{
    item_id: 'shirt', name: 'Linen shirt', category: 'top', color_main: 'white',
    thumbnail_url: 'https://images.example.test/shirt?signature=fresh',
  }],
});
const tripMetadata = toAskMetadata({
  item_refs: ['shirt'], trip_intent: { is_trip: true, duration_days: 3 },
});
const ordinaryTurns = conversationTurns([
  { id: 'ordinary-user', role: 'user', content: 'How can I wear this shirt?', createdAt: '', styling: null },
  { id: 'ordinary-answer', askSessionId: 'ordinary-session', role: 'assistant', content: 'Try it with jeans.', createdAt: '', styling: null, ...ordinaryMetadata },
  { id: 'trip-user', role: 'user', content: 'What should I pack?', createdAt: '', styling: null },
  { id: 'trip-answer', askSessionId: 'trip-session', role: 'assistant', content: 'Pack for three days.', createdAt: '', styling: null, ...tripMetadata },
], 'No answer yet');
assert.deepEqual(ordinaryTurns[0].itemRefs, ['shirt']);
assert.deepEqual(ordinaryTurns[0].itemRefSnapshots, [{
  itemId: 'shirt', name: 'Linen shirt', category: 'top', colorMain: 'white',
  thumbnailUrl: 'https://images.example.test/shirt?signature=fresh',
}]);
assert.equal(ordinaryTurns[0].tripIntent, null);
assert.deepEqual(ordinaryTurns[1].tripIntent, { isTrip: true, durationDays: 3 });
assert.equal(ordinaryTurns[1].feedbackSessionId, 'trip-session');
assert.deepEqual(toAskMetadata({}), { itemRefs: [], itemRefSnapshots: [], tripIntent: null });

// Resuming a historical non-design Ask must not lose wardrobe links or
// the packing handoff simply because the compact conversation omitted them.
const tripHistory = {
  askSessionId: 'trip-session', conversationId: 'trip-conversation',
  question: 'Pack for three days', answer: 'Bring the jacket',
  itemRefs: ['jacket'], itemRefSnapshots: [{
    itemId: 'jacket', name: 'Jacket', category: 'outerwear' as const,
    colorMain: 'navy', thumbnailUrl: null,
  }],
  tripIntent: { isTrip: true, durationDays: 3 },
  createdAt: '', styling: null,
};
const compactTrip = conversationTurns([
  { id: 'trip-question', role: 'user', content: tripHistory.question, createdAt: '', styling: null },
  { id: 'trip-answer', askSessionId: tripHistory.askSessionId,
    role: 'assistant', content: tripHistory.answer, createdAt: '', styling: null },
], 'No answer yet');
const enrichedTrip = enrichConversationTurns(compactTrip, [tripHistory]);
assert.deepEqual(enrichedTrip[0].itemRefs, ['jacket']);
assert.deepEqual(enrichedTrip[0].itemRefSnapshots, tripHistory.itemRefSnapshots);
assert.deepEqual(enrichedTrip[0].tripIntent, tripHistory.tripIntent);
assert.deepEqual(compactTrip[0].itemRefs, [], 'enrichment does not mutate the compact source');
assert.deepEqual(enrichConversationTurns(compactTrip, [{ ...tripHistory, askSessionId: 'other' }]), compactTrip);

const liveTrip = conversationTurns([
  { id: 'trip-question', role: 'user', content: tripHistory.question, createdAt: '', styling: null },
  { id: 'trip-answer', askSessionId: tripHistory.askSessionId, role: 'assistant', content: tripHistory.answer,
    createdAt: '', styling: null, itemRefs: [], itemRefSnapshots: [], tripIntent: null },
], 'No answer yet');
const clearedTrip = enrichConversationTurns(liveTrip, [tripHistory])[0];
assert.deepEqual(clearedTrip.itemRefs, [], 'live empty refs cannot be resurrected from cached history');
assert.deepEqual(clearedTrip.itemRefSnapshots, []);
assert.equal(clearedTrip.tripIntent, null, 'live null trip metadata removes the old packing handoff');
const freshOrdinary = enrichConversationTurns(ordinaryTurns, [{ ...tripHistory, askSessionId: 'ordinary-session' }])[0];
assert.deepEqual(freshOrdinary.itemRefs, ordinaryTurns[0].itemRefs);
assert.deepEqual(freshOrdinary.itemRefSnapshots, ordinaryTurns[0].itemRefSnapshots, 'fresh signed URLs beat cached snapshots');
assert.equal(freshOrdinary.tripIntent, null);
const removedRefs = conversationTurns([
  { id: 'trip-question', role: 'user', content: tripHistory.question, createdAt: '' },
  { id: 'trip-answer', askSessionId: tripHistory.askSessionId, role: 'assistant', content: tripHistory.answer,
    createdAt: '', itemRefs: [] },
], 'No answer yet');
assert.deepEqual(enrichConversationTurns(removedRefs, [tripHistory])[0].itemRefSnapshots, [], 'fallback snapshots must match live refs');

const key = askConversationStorageKey('server', 'user-a', 'global');
assert.ok(key);
assert.notEqual(key, askConversationStorageKey('server', 'user-b', 'global'));
assert.notEqual(key, askConversationStorageKey('other-server', 'user-a', 'global'));
assert.notEqual(key, askConversationStorageKey('server', 'user-a', 'item', 'coat'));
assert.equal(askConversationStorageKey('server', null, 'global'), null);

const first: StylingState = {
  conversationId: 'conversation', revision: 1, status: 'draft',
  outfit: {
    id: 'first-outfit', title: 'First', reason: '', variant: 'safe',
    timeSensitivity: 'standard', isFavorited: false, items: [{ id: 'coat' }, { id: 'old-shoes' }],
  },
  constraints: { lockedItemIds: ['coat'], excludedItemIds: [], goal: null, notes: [], targetStyle: null, exploration: false },
  recommendationId: null, recommendationRevision: null, recommendationDate: null,
};
const second: StylingState = {
  ...first, revision: 2,
  outfit: { ...first.outfit, id: 'second-outfit', items: [{ id: 'coat' }, { id: 'new-shoes' }] },
};
assert.equal(enrichConversationTurns(liveTrip, [{ ...tripHistory, styling: first }])[0].styling, null);
assert.equal(enrichConversationTurns(removedRefs, [{ ...tripHistory, styling: first }])[0].styling, undefined);
const legacyStyling = conversationTurns([
  { id: 'trip-question', role: 'user', content: tripHistory.question, createdAt: '' },
  { id: 'trip-answer', askSessionId: tripHistory.askSessionId, role: 'assistant', content: tripHistory.answer, createdAt: '' },
], 'No answer yet');
assert.equal(enrichConversationTurns(legacyStyling, [{ ...tripHistory, styling: first }])[0].styling, first);
const restored = conversationTurns([
  { id: 'u1', role: 'user', content: 'An outfit', createdAt: '', styling: null },
  { id: 'a1', askSessionId: 'session-1', role: 'assistant', content: 'First', createdAt: '', styling: first },
  { id: 'u2', role: 'user', content: 'Swap shoes', createdAt: '', styling: null },
  { id: 'a2', askSessionId: 'session-2', role: 'assistant', content: 'Second', createdAt: '', styling: second },
], 'No answer yet');
assert.deepEqual(restored.map((turn) => turn.itemRefs), [['coat', 'old-shoes'], ['coat', 'new-shoes']]);
assert.deepEqual(restored.map((turn) => turn.feedbackSessionId), ['session-1', 'session-2']);
assert.equal(newestStyling(second, first), second, 'a delayed retry cannot roll the current outfit back');
assert.equal(newestStyling(first, second), second);
assert.equal(newestStyling(null, first), first);
const saved = stylingDesignBrief(second);
const pending = { ...saved, revision: 3, needsOutfitUpdate: true, constraints: { ...saved.constraints, goal: 'Try a new style' } };
assert.equal(newestDesignBrief(saved, pending), pending);
assert.equal(newestDesignBrief(pending, saved), pending, 'a delayed outfit response cannot discard newer saved conditions');
assert.equal(newestDesignBrief(pending, null), pending);
assert.equal(newestDesignBrief(null, pending), pending, 'conditions can be restored before the first outfit exists');
assert.equal(stylingDesignBrief(second).needsOutfitUpdate, false);
assert.notEqual(
  askConversationStorageKey('server', 'user-a', 'today', undefined, 'first-outfit'),
  askConversationStorageKey('server', 'user-a', 'today', undefined, 'second-outfit'),
);
