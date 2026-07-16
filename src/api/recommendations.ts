import { apiDelete, apiGet, apiPost } from './client';
import type {
  FeedbackBundleBody,
  FeedbackBundleResult,
  FeedbackTagsResponse,
  FirstOutfitGate,
  OutfitDetail,
  OutfitObstacle,
  OutfitReplacementCandidate,
  OutfitScores,
  OutfitSummary,
  SendFeedbackBody,
  ServerFeedbackTagsResponse,
  ServerFavoriteOutfitResponse,
  ServerFirstOutfitGate,
  ServerOutfitObstacle,
  ServerOutfitResponse,
  ServerOutfitReplacementsResponse,
  ServerOutfitScores,
  ServerTodayContext,
  ServerTodayRecommendation,
  TodayContext,
  TodayRecommendation,
} from '@/types/api';
import { toI18nMessage } from '@/utils/i18n';

function toScores(s?: ServerOutfitScores | null): OutfitScores | null {
  if (!s) return null;
  return {
    aesthetic: s.aesthetic,
    feasibility: s.feasibility,
    fit: s.fit,
    total: s.total,
    prepMinutes: s.prep_minutes,
    rulesVersion: s.rules_version,
  };
}

function toObstacle(o: ServerOutfitObstacle): OutfitObstacle {
  return {
    kind: o.kind,
    itemId: o.item_id,
    severity: o.severity,
    title: toI18nMessage(o.title),
    replacementCandidateIds: o.replacement_candidate_ids ?? [],
  };
}

function toContext(c?: ServerTodayContext | null): TodayContext | null {
  if (!c) return null;
  return {
    weather: c.weather
      ? {
          temperatureC: c.weather.temperature_c,
          feelsLikeC: c.weather.feels_like_c,
          rainProbability: c.weather.rain_probability,
          condition: c.weather.condition,
          humidity: c.weather.humidity ?? null,
          windDir: c.weather.wind_dir ?? null,
          windScale: c.weather.wind_scale ?? null,
          windSpeed: c.weather.wind_speed ?? null,
          icon: c.weather.icon ?? null,
          locationName: c.weather.location_name ?? null,
        }
      : null,
    scene: c.scene ?? null,
    fetchedAt: c.fetched_at ?? null,
  };
}

function toOutfit(outfit: ServerOutfitResponse): OutfitSummary {
  return {
    id: outfit.outfit_id,
    variant: outfit.type,
    title: outfit.title,
    reason: outfit.reason,
    timeSensitivity: outfit.time_sensitivity ?? 'standard',
    isFavorited: outfit.is_favorited ?? false,
    items: outfit.items.map((item) => ({
      id: item.item_id,
      name: item.title,
      category: item.category,
    })),
    scores: toScores(outfit.scores),
    obstacles: outfit.obstacles?.map(toObstacle) ?? null,
    prepSteps: outfit.prep_steps?.map(toI18nMessage) ?? null,
    prepNotes: outfit.prep_notes?.map(toI18nMessage) ?? null,
  };
}

function toToday(data: ServerTodayRecommendation): TodayRecommendation {
  return {
    date: data.recommendation_date,
    state: data.status,
    guidanceText: data.guidance_text ?? null,
    // API_GAP[untracked]: TodayRecommendation has no countdown_minutes from BE.
    // Fallback: always null (Today doesn't render a countdown). See docs/api-gaps.md.
    countdownMinutes: null,
    outfits: data.outfits.map(toOutfit),
    styleContext: data.style_context
      ? {
          templateId: data.style_context.template_id,
          activeTags: data.style_context.active_tags ?? [],
          confidence: data.style_context.confidence ?? 0,
        }
      : null,
    context: toContext(data.context),
    // BE#78/#80/#77 — absent on legacy payloads; consumers handle null.
    appliedContext: data.applied_context
      ? {
          overrideText: data.applied_context.override_text ?? null,
          constraints: data.applied_context.constraints ?? [],
        }
      : null,
    resurfaceInsight: data.resurface_insight
      ? {
          id: data.resurface_insight.id,
          text: data.resurface_insight.text,
          itemId: data.resurface_insight.item_id,
          reason: data.resurface_insight.reason,
          cooldownKey: data.resurface_insight.cooldown_key,
        }
      : null,
    mode: data.mode ?? null,
    canRefresh: data.can_refresh ?? false,
    canContextOverride: data.can_context_override ?? false,
  };
}

// BE#77 — `targetDate` (YYYY-MM-DD, today or tomorrow only) switches Today to
// date-aware mode; omitted → legacy today. Flag-off backends ignore the param.
export async function getTodayRecommendation(
  scene?: 'commute' | 'formal' | 'casual',
  targetDate?: string,
) {
  // Cold cache runs read-time LLM enrichment (reasoning/prep) and was measured
  // at ~27s — past the default 15s timeout, which surfaced as a bogus "网络异常"
  // while the backend actually succeeded. Same 60s budget as refresh/first-outfit.
  return toToday(
    await apiGet<ServerTodayRecommendation>(
      '/v1/recommendations/today',
      {
        scene,
        target_date: targetDate,
      },
      { timeout: 60_000 },
    ),
  );
}

// BE #79 — cold-start feasibility gate. The verdict is derived from the same
// daily the Today pipeline persists (BE generates it on first call if absent),
// so this can take as long as a refresh (~25s of LLM work) — same 60s budget.
export async function getFirstOutfitGate(): Promise<FirstOutfitGate> {
  const data = await apiGet<ServerFirstOutfitGate>(
    '/v1/recommendations/first-outfit',
    undefined,
    { timeout: 60_000 },
  );
  return {
    state: data.state,
    feasibleOutfitCount: data.feasible_outfit_count,
    missingSlots: data.missing_slots,
    firstOutfit: data.first_outfit ? toOutfit(data.first_outfit) : null,
    gateFailures: data.gate_failures,
  };
}

// V3+ D3 — user-initiated refresh. Rate-limited (default 3/day).
// Server returns 429 when the daily limit is exhausted; 403 when the feature flag is off.
// Regeneration drives several LLM calls and routinely takes ~25s — well over the
// client's default 15s timeout, which surfaced as a bogus "网络异常" while the
// backend actually succeeded. Give it a generous 60s budget.
// BE#78 — a chip or free-text context override applied as a session-scoped
// constraint on this one regeneration; the response echoes `applied_context`.
export interface ContextOverride {
  text?: string;
  source: 'chip' | 'free_text';
  chipId?: string;
}

export async function refreshTodayRecommendation(
  scene?: 'commute' | 'formal' | 'casual',
  override?: ContextOverride,
  targetDate?: string,
) {
  return toToday(
    await apiPost<ServerTodayRecommendation>(
      '/v1/recommendations/today/refresh',
      override
        ? {
            context_override: {
              text: override.text ?? null,
              source: override.source,
              chip_id: override.chipId ?? null,
            },
          }
        : null,
      { scene, target_date: targetDate },
      { timeout: 60_000 },
    ),
  );
}

export async function getOutfitDetail(outfitId: string) {
  return toOutfit(
    await apiGet<ServerOutfitResponse>(`/v1/recommendations/outfits/${outfitId}`),
  ) satisfies OutfitDetail;
}

// Ack-only: the BE returns `{ success }`; the caller already knows the target
// favorite state from the request, so these resolve to void.
export async function favoriteOutfit(outfitId: string): Promise<void> {
  await apiPost<ServerFavoriteOutfitResponse>(
    `/v1/recommendations/outfits/${outfitId}/favorite`,
    null,
    undefined,
    { silentErrorToast: true },
  );
}

export async function unfavoriteOutfit(outfitId: string): Promise<void> {
  await apiDelete<ServerFavoriteOutfitResponse>(
    `/v1/recommendations/outfits/${outfitId}/favorite`,
    { silentErrorToast: true },
  );
}

export async function getOutfitItemReplacements(
  outfitId: string,
  itemId: string,
): Promise<OutfitReplacementCandidate[]> {
  const data = await apiGet<ServerOutfitReplacementsResponse>(
    `/v1/recommendations/outfits/${outfitId}/items/${itemId}/replacements`,
    undefined,
    { silentErrorToast: true },
  );
  return data.replacements.map((item) => ({
    itemId: item.item_id,
    title: item.title,
    category: item.category,
    colorMain: item.color_main,
    thumbnailUrl: item.thumbnail_url ?? null,
    similarity: item.similarity,
  }));
}

export function markOutfitWorn(outfitId: string, wornDate?: string) {
  return apiPost<{ success: boolean }>(`/v1/recommendations/outfits/${outfitId}/wear`, {
    worn_date: wornDate,
  });
}

export function sendOutfitFeedback(outfitId: string, body: SendFeedbackBody) {
  return apiPost<{ success: boolean }>(`/v1/recommendations/outfits/${outfitId}/feedback`, {
    feedback_type: body.kind,
    reason_tags: body.reasonTags ?? [],
  });
}

// V3+ A — single-transaction overall + per-item submission.
// On 422 the server rolls back; caller should reload the outfit and retry.
export async function sendOutfitFeedbackBundle(
  outfitId: string,
  body: FeedbackBundleBody,
): Promise<FeedbackBundleResult> {
  return apiPost<FeedbackBundleResult>(
    `/v1/recommendations/outfits/${outfitId}/feedback/bundle`,
    {
      overall: {
        feedback_type: body.overall.kind,
        reason_tags: body.overall.reasonTags ?? [],
      },
      items: (body.items ?? []).map((it) => ({
        item_id: it.itemId,
        feedback_type: it.feedbackType,
        scene: it.scene ?? null,
        comfort_score: it.comfortScore ?? null,
      })),
    },
  );
}

// V3+ A — reason tag dictionary, scoped by scene.
export async function getFeedbackTags(scene?: string): Promise<FeedbackTagsResponse> {
  const data = await apiGet<ServerFeedbackTagsResponse>('/v1/recommendations/feedback-tags', {
    scene,
  });
  return {
    scene: data.scene ?? null,
    tags: data.tags.map((t) => ({
      key: t.key,
      labelZhCn: t.label_zh_cn,
      appliesTo: t.applies_to,
    })),
  };
}
