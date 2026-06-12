import { apiGet } from './client';
import type {
  ColorPalette,
  IdleItem,
  InsightsSummary,
  ServerIdleItem,
  ServerInsightsSummary,
  ServerTopItem,
  TopItem,
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
