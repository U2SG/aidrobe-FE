import assert from 'node:assert/strict';
import { conversationTurns, reconcileLinkedTurns } from '../src/utils/askConversation.ts';
import { designContextMatches } from '../src/utils/designContinuity.ts';
import { experienceState } from '../src/utils/stylingExperience.ts';
import { toWardrobeDecision } from '../src/api/purchaseDecisionMapping.ts';
import type { StylingExperience } from '../src/api/stylingExperiences.ts';

const conversation = 'AAAAAAAA-0000-0000-0000-000000000001';
const context = { conversationId: conversation, expectedRevision: 3 };
assert.equal(designContextMatches(context, null), false, 'old servers must not be reported as linked');
assert.equal(designContextMatches(context, { conversationId: conversation, revision: 2, outfitId: 'old' }), false);
assert.equal(designContextMatches(context, { conversationId: conversation.toLowerCase(), revision: 3, outfitId: null }), true,
  'a pending brief carries valid conditions without pretending its old outfit is current');
assert.equal(designContextMatches(context, { conversationId: 'another', revision: 3, outfitId: null }), false);

const decision = toWardrobeDecision({
  id: 'decision', decision: 'wait', decision_text: '先试试已有的外套', uncertainty: 'medium', created_at: '2026-11-15T12:00:00Z',
  design_context: { conversation_id: conversation, revision: 3, outfit_id: null, constraints: { goal: '轻松一点' } },
});
assert.equal(designContextMatches(context, decision.designContext), true);

const linked = { kind: 'packing_list' as const, resourceId: 'packing', sourceRevision: 3, summary: '排好了三天的行程' };
const turns = conversationTurns([
  { id: 'question', role: 'user', content: '出差怎么穿？', createdAt: '1' },
  { id: 'answer', role: 'assistant', content: '先留这件外套。', createdAt: '2', askSessionId: 'session' },
  { id: 'trip', role: 'assistant', content: linked.summary, linkedResult: linked, createdAt: '3' },
  { id: 'follow-up', role: 'user', content: '第二天想轻松一点', createdAt: '4' },
  { id: 'next-answer', role: 'assistant', content: '第二天换这双鞋。', createdAt: '5', askSessionId: 'next-session' },
], 'answer');
assert.equal(turns.length, 3);
assert.equal(turns[0]?.answer, '先留这件外套。', 'a linked result must not replace the preceding answer');
assert.equal(turns[1]?.linkedResult?.resourceId, 'packing');
assert.equal(turns[1]?.feedbackSessionId, undefined, 'linked results are not Ask turns to rate');
assert.equal(turns[2]?.question, '第二天想轻松一点');
const reconciled = reconcileLinkedTurns(turns, []);
assert.deepEqual(reconciled.map((turn) => turn.id), ['question', 'follow-up'],
  'deletion or a disabled capability removes only its linked cards, preserving ordinary conversation');
const updatedLink = { ...turns[1]!, linkedResult: { ...linked, summary: '已更新的清单摘要' } };
assert.equal(reconcileLinkedTurns(turns, [updatedLink])[1]?.linkedResult?.summary, '已更新的清单摘要');
assert.equal(conversationTurns([{ id: 'trip', role: 'assistant', content: linked.summary, linkedResult: linked, createdAt: '1' }], '')[0]?.linkedResult?.resourceId, 'packing');

function experience(kind: StylingExperience['kind'], patch: Partial<StylingExperience> = {}): StylingExperience {
  return {
    experience_id: kind, request_id: 'request', outfit_id: 'outfit', kind,
    conversation_id: conversation, revision: 3, worn_date: null, feedback: null, note: null,
    occasion: null, created_at: '2026-11-15T12:00:00Z', supersedes_id: null, ...patch,
  };
}
const reactions = [experience('appreciated'), experience('want_to_try')];
const unworn = experienceState({ items: reactions, latest_worn_date: null });
assert.ok(unworn.appreciated);
assert.ok(unworn.wantToTry);
assert.equal(unworn.wornDate, null);
assert.equal(unworn.wearFeedback, undefined, 'liking the visual or wanting to try never claims a wear');
const reflected = experienceState({
  latest_worn_date: '2026-11-15',
  items: [
    experience('wear_feedback', { experience_id: 'old', worn_date: '2026-11-14', feedback: 'dislike' }),
    ...reactions,
    experience('wear_feedback', { experience_id: 'current', worn_date: '2026-11-15', feedback: 'like' }),
  ],
});
assert.equal(reflected.wearFeedback?.experience_id, 'current', 'a different worn day keeps its own experience');
assert.equal(experienceState({ items: [], latest_worn_date: '2026-11-15' }).wearFeedback, undefined,
  'revoking a reflection does not remove the actual wear or fabricate a replacement');

console.log('designer continuity: saved result identity, replay, and distinct experience stages passed');
