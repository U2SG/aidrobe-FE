import { apiGet } from './client';
import type {
  ColorPalette,
  CostPerWearItem,
  IdleItem,
  InsightsSummary,
  ServerCostPerWearItem,
  ServerIdleItem,
  ServerInsightsSummary,
  ServerStyleTrendResponse,
  ServerTopItem,
  ServerWardrobeReportResponse,
  StyleTrendEntry,
  TopItem,
  WardrobeHealth,
  WardrobeReport,
} from '@/types/api';

function toTop(item: ServerTopItem): TopItem {
  return {
    id: item.item_id,
    name: item.title,
    category: item.category,
    imageUrl: item.cover_image_url ?? null,
    wearCount: item.wear_count,
  };
}

function toIdle(item: ServerIdleItem): IdleItem {
  return { ...toTop(item), lastWorn: item.last_worn ?? null };
}

export async function getInsightsSummary(): Promise<InsightsSummary> {
  const data = await apiGet<ServerInsightsSummary>('/v1/insights/summary');
  return {
    totalItems: data.total_items,
    activeRate: data.active_rate,
    idleCount: data.idle_count,
    idleThresholdDays: data.idle_threshold_days,
    mostWornCategory: data.most_worn_category ?? null,
    favoriteColor: data.favorite_color ?? null,
    wearHistoryCount: data.wear_history_count ?? null,
    hasSufficientWearHistory: data.has_sufficient_wear_history ?? null,
    reportAvailable: data.report_available ?? null,
  };
}

export async function getTopItems(limit = 10): Promise<TopItem[]> {
  const data = await apiGet<ServerTopItem[]>('/v1/insights/top-items', { limit });
  return data.map(toTop);
}

export async function getIdleItems(thresholdDays = 60): Promise<IdleItem[]> {
  const data = await apiGet<ServerIdleItem[]>('/v1/insights/idle-items', {
    threshold_days: thresholdDays,
  });
  return data.map(toIdle);
}

export async function getColorPalette(): Promise<ColorPalette> {
  return apiGet<ColorPalette>('/v1/insights/color-palette');
}

// V4 — monthly tag-frequency trend for the style-trend chart.
export async function getStyleTrend(): Promise<StyleTrendEntry[]> {
  const data = await apiGet<ServerStyleTrendResponse>('/v1/insights/style-trend');
  return data.trend.map((e) => ({ yearMonth: e.year_month, tags: e.tags }));
}

// V4 — cost-per-wear per item (Decimal fields arrive as JSON numbers).
export async function getCostPerWear(): Promise<CostPerWearItem[]> {
  const data = await apiGet<ServerCostPerWearItem[]>('/v1/insights/cost-per-wear');
  return data.map((it) => ({
    itemId: it.item_id,
    title: it.title,
    purchasePrice: it.purchase_price != null ? Number(it.purchase_price) : null,
    wearCount: it.wear_count,
    costPerWear: it.cost_per_wear != null ? Number(it.cost_per_wear) : null,
  }));
}

// FE #46 — wardrobe health score + coded insights. V3 endpoint: returns data
// DIRECTLY (no envelope). Gated by ENABLE_WARDROBE_HEALTH (503 when off — the
// consuming surface omits its card rather than erroring). The server returns
// stable codes + numeric metrics only; the FE localizes (see wardrobeHealth.ts).
// The wire shape already matches the client type, so it passes through as-is.
export async function getWardrobeHealth(): Promise<WardrobeHealth> {
  // Optional card: the screen omits it on 503 (flag off) / any error, so
  // suppress the global error toast for this request.
  return apiGet<WardrobeHealth>('/v1/insights/wardrobe-health', undefined, {
    silentErrorToast: true,
  });
}

// V4 M21 — "wardrobe wrapped" report. Gated by ENABLE_WARDROBE_REPORT (503
// when off). `period` is a string like "2026-H1".
export async function getWardrobeReport(period: string): Promise<WardrobeReport> {
  const data = await apiGet<ServerWardrobeReportResponse>(`/v1/insights/reports/${period}`);
  return {
    period: data.period,
    label: data.label,
    startDate: data.start_date,
    endDate: data.end_date,
    isEmpty: data.is_empty,
    totalWears: data.total_wears,
    prevTotalWears: data.prev_total_wears,
    topItems: data.top_items.map((t) => ({
      itemId: t.item_id,
      title: t.title,
      category: t.category,
      coverImageUrl: t.cover_image_url ?? null,
      wearCount: t.wear_count,
    })),
    topCombos: data.top_combos.map((c) => ({
      outfitId: c.outfit_id,
      title: c.title,
      wearCount: c.wear_count,
    })),
    colorPalette: data.color_palette,
    styleKeywords: data.style_keywords,
    styleTrend: data.style_trend
      ? {
          period: data.style_trend.period,
          prevPeriod: data.style_trend.prev_period,
          current: data.style_trend.current,
          previous: data.style_trend.previous,
          rising: data.style_trend.rising,
          fading: data.style_trend.fading,
        }
      : null,
    highestCostPerWear: data.highest_cost_per_wear
      ? {
          itemId: data.highest_cost_per_wear.item_id,
          title: data.highest_cost_per_wear.title,
          purchasePrice: Number(data.highest_cost_per_wear.purchase_price),
          wearCount: data.highest_cost_per_wear.wear_count,
          costPerWear: Number(data.highest_cost_per_wear.cost_per_wear),
        }
      : null,
    longestIdleItem: data.longest_idle_item
      ? {
          itemId: data.longest_idle_item.item_id,
          title: data.longest_idle_item.title,
          category: data.longest_idle_item.category,
          coverImageUrl: data.longest_idle_item.cover_image_url ?? null,
          lastWorn: data.longest_idle_item.last_worn ?? null,
          idleDays: data.longest_idle_item.idle_days ?? null,
        }
      : null,
    recommendationAdoptionRate: data.recommendation_adoption_rate,
  };
}
