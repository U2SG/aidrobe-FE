import { apiGet, apiPost } from './client';
import type {
  FeedbackBundleBody,
  FeedbackBundleResult,
  FeedbackTagsResponse,
  OutfitDetail,
  OutfitObstacle,
  OutfitScores,
  OutfitSummary,
  SendFeedbackBody,
  ServerFeedbackTagsResponse,
  ServerOutfitObstacle,
  ServerOutfitResponse,
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
  };
}

export async function getTodayRecommendation(scene?: 'commute' | 'formal' | 'casual') {
  return toToday(await apiGet<ServerTodayRecommendation>('/v1/recommendations/today', { scene }));
}

// V3+ D3 — user-initiated refresh. Rate-limited (default 3/day).
// Server returns 429 when the daily limit is exhausted; 503 when the feature flag is off.
// Regeneration drives several LLM calls and routinely takes ~25s — well over the
// client's default 15s timeout, which surfaced as a bogus "网络异常" while the
// backend actually succeeded. Give it a generous 60s budget.
export async function refreshTodayRecommendation(scene?: 'commute' | 'formal' | 'casual') {
  return toToday(
    await apiPost<ServerTodayRecommendation>(
      '/v1/recommendations/today/refresh',
      null,
      { scene },
      { timeout: 60_000 },
    ),
  );
}

export async function getOutfitDetail(outfitId: string) {
  return toOutfit(
    await apiGet<ServerOutfitResponse>(`/v1/recommendations/outfits/${outfitId}`),
  ) satisfies OutfitDetail;
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
