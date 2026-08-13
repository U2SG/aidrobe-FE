// V3-009 — wire-shaped decision fixtures, shared by the regression test and by
// the browser evidence driver so the screenshots show the SAME payload the
// tests assert on. Hand-authored JSON that drifts from the contract would give
// screenshots of a screen rendering data the backend could never send.
//
// Every object here is a literal `WardrobeDecisionResponse` /
// `PurchaseCandidateResponse` from docs/openapi.json: all required fields
// present (`candidate_id` became required in the BE#144/FE#139 sweep),
// snake_case, server-rendered display copy — the client never synthesizes it.
//
// Deliberately dependency-free and OUTSIDE src/ (the copy denylist walks src/,
// and these fixtures deliberately carry realistic long product copy).
import type {
  ServerPurchaseCandidate,
  ServerWardrobeDecision,
} from '../../src/api/purchaseDecisionMapping.ts';

export const CANDIDATE_ID = '4e0c8b1e-2f6a-4c3d-9b71-6a1f2c8d0e53';
export const DECISION_ID = 'a7f1c9d2-3b48-4e5f-8a26-9c0d1e2f3a4b';

/** A fully parsed candidate — the common path. */
export const PARSED_CANDIDATE: ServerPurchaseCandidate = {
  id: CANDIDATE_ID,
  status: 'parsed',
  parsed_item: {
    category: 'outerwear',
    colors: ['beige'],
    silhouette: 'straight',
    material_hints: ['cotton'],
    price: '¥1,280',
    scene_tags: ['commute'],
  },
};

/** The degraded path: the parser could not read the source, but the candidate
 * is still decidable (contract §5.2) — partial information, not a dead end. */
export const UNPARSED_CANDIDATE: ServerPurchaseCandidate = {
  id: CANDIDATE_ID,
  status: 'parse_failed',
  parsed_item: null,
};

/** `avoid_duplicate` with a full closet comparison — the state where the
 * existing-item alternative must be visible (feature acceptance 3). */
export const DUPLICATE_DECISION: ServerWardrobeDecision = {
  id: DECISION_ID,
  candidate_id: CANDIDATE_ID,
  decision: 'avoid_duplicate',
  decision_text: '不建议重复购买',
  reasons: [
    { kind: 'redundancy', text: '你衣橱里已经有 3 件同类外套，其中一件颜色和廓形都很接近。' },
    { kind: 'scene_coverage', text: '它主要覆盖的通勤场景，已有单品都能满足。' },
    { kind: 'compatibility', text: '能搭出的组合和你已有的那件基本重合。' },
  ],
  closet_comparison: {
    summary_text: '你已有的米色短外套覆盖了它的大部分使用场景。',
    similar_items: [
      { item_id: '11111111-1111-4111-8111-111111111111', image_url: null, relation: 'covers' },
      { item_id: '22222222-2222-4222-8222-222222222222', image_url: null, relation: 'covers' },
      { item_id: '33333333-3333-4333-8333-333333333333', image_url: null, relation: 'complements' },
    ],
  },
  uncertainty: 'low',
  visual_need: 'none',
  boundary_note: '用于判断整体感觉；实际尺码、触感和精确垂坠仍需参考商品信息。',
  next_actions: ['skip', 'style_with_existing', 'recheck_color'],
  created_at: '2026-08-13T04:12:07.512000+00:00',
};

/** `worth_adding`, medium uncertainty, no comparison block at all — proves the
 * card stays complete when an optional layer is absent (V3-008 acceptance 2). */
export const WORTH_ADDING_DECISION: ServerWardrobeDecision = {
  id: DECISION_ID,
  candidate_id: CANDIDATE_ID,
  decision: 'worth_adding',
  decision_text: '值得加入',
  reasons: [
    { kind: 'scene_coverage', text: '它补上了你目前缺少的轻薄防雨外层。' },
    { kind: 'compatibility', text: '和你常穿的直筒长裤、白衬衫都能搭成完整一套。' },
  ],
  closet_comparison: null,
  uncertainty: 'medium',
  visual_need: 'recommended',
  boundary_note: '用于判断整体感觉；实际尺码、触感和精确垂坠仍需参考商品信息。',
  next_actions: ['add_to_candidates', 'skip'],
  created_at: '2026-08-13T04:12:07.512000+00:00',
};

/** The dynamic-text stress case: maximally long server copy in both locales.
 * The failure this catches is real — `decision_text`, `reasons[].text` and
 * `summary_text` are ALL server-owned (§5.3), so the client cannot shorten
 * them and a 360dp layout has to absorb whatever arrives. */
export const LONG_COPY_DECISION: ServerWardrobeDecision = {
  id: DECISION_ID,
  candidate_id: CANDIDATE_ID,
  decision: 'consider_alternate',
  decision_text: '可以考虑，但建议换个颜色 — Worth considering, but a different colour would sit better',
  reasons: [
    {
      kind: 'redundancy',
      text: '你衣橱里已经有 4 件同类别的外套，其中两件的主色和这件非常接近，日常轮换时很可能会互相取代，实际穿着频次会被摊薄。',
    },
    {
      kind: 'compatibility',
      text: '它能和你已有的 6 件下装组成完整搭配，但其中 5 套的整体配色都偏冷，和你最近三个月的穿着记录里偏暖的倾向不太一致。',
    },
    {
      kind: 'scene_coverage',
      text: 'This mostly covers your commute and weekend-errand scenes, both of which your existing beige jacket already handles well enough on its own.',
    },
  ],
  closet_comparison: {
    summary_text:
      '你已有的米色短外套和深灰风衣覆盖了它的大部分使用场景；真正没被覆盖的只有偏正式的场合，而那类场合你今年只记录过两次。',
    similar_items: [
      { item_id: '11111111-1111-4111-8111-111111111111', image_url: null, relation: 'covers' },
      { item_id: '22222222-2222-4222-8222-222222222222', image_url: null, relation: 'complements' },
    ],
  },
  uncertainty: 'high',
  visual_need: 'helpful',
  boundary_note:
    '用于判断整体感觉；实际尺码、触感和精确垂坠仍需参考商品信息。This judgment describes fit against your wardrobe, not against your body.',
  next_actions: ['recheck_color', 'add_to_candidates', 'skip'],
  created_at: '2026-08-13T04:12:07.512000+00:00',
};

/** Version skew: a decision value this build has never heard of. The card must
 * still render the server copy, with no tone and no decision-specific action
 * (contract §3, frozen). */
export const UNKNOWN_DECISION: ServerWardrobeDecision = {
  ...WORTH_ADDING_DECISION,
  decision: 'buy_immediately_and_twice',
  decision_text: '服务端给出了一个这个版本还不认识的判断。',
  next_actions: ['add_to_candidates', 'teleport_it_here'],
};
