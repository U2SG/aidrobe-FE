import { apiDelete, apiGet, apiPatch } from './client';
import type {
  CutoutStatus,
  ItemWearHistory,
  ListWardrobeItemsQuery,
  ListWardrobeItemsResponse,
  ServerItemWearHistory,
  ServerListWardrobeItemsResponse,
  ServerWardrobeItem,
  UpdateFitBody,
  UpdateWardrobeItemBody,
  WardrobeItem,
} from '@/types/api';

function toCutoutStatus(value: string | null | undefined): CutoutStatus {
  return value === 'queued' || value === 'ready' || value === 'failed' ? value : 'skipped';
}

export function toWardrobeItem(item: ServerWardrobeItem): WardrobeItem {
  return {
    id: item.item_id,
    name: item.title,
    nameSource: item.name_source ?? null,
    displayName: item.display_name ?? null,
    localizedNames: item.localized_names ?? null,
    category: item.category,
    color: item.color_main,
    imageUrl: item.cover_image_url ?? item.original_image_url ?? null,
    status: item.status,
    cutoutStatus: toCutoutStatus(item.cutout_status),
    location: item.location ?? null,
    subCategory: item.sub_category ?? null,
    colorSecondary: item.color_secondary ?? null,
    material: item.material ?? null,
    seasonTags: item.season_tags ?? null,
    styleTags: item.style_tags ?? null,
    formalityScore: item.formality_score ?? null,
    timeCostLevel: item.time_cost_level ?? null,
    purchasePrice: item.purchase_price ?? null,
    wearCount: item.wear_count ?? 0,
    sizeLabel: item.size_label ?? null,
    sizeRegion: item.size_region ?? null,
    fitIntent: item.fit_intent ?? null,
    fitStatus: item.fit_status,
    comfortScore: item.comfort_score ?? null,
    lastWorn: item.last_worn ?? null,
    purchaseDate: item.purchase_date ?? null,
  };
}

// V3+ A — pre-aggregated daily counts for the ItemDetail heatmap.
export async function getItemWearHistory(itemId: string, days = 60): Promise<ItemWearHistory> {
  const data = await apiGet<ServerItemWearHistory>(
    `/v1/wardrobe-items/${itemId}/wear-history`,
    { days },
  );
  return {
    itemId: data.item_id,
    days: data.days,
    dailyCounts: data.daily_counts,
    entries: data.entries.map((e) => ({
      wornDate: e.worn_date,
      outfitId: e.outfit_id,
      outfitType: e.outfit_type ?? null,
    })),
  };
}

export async function listWardrobeItems(query: ListWardrobeItemsQuery = {}) {
  const data = await apiGet<ServerListWardrobeItemsResponse>('/v1/wardrobe-items', {
    category: query.category === 'all' ? undefined : query.category,
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
  });
  return {
    items: data.items.map(toWardrobeItem),
    limit: data.limit,
    offset: data.offset,
    total: data.total,
  } satisfies ListWardrobeItemsResponse;
}

export async function getWardrobeItem(id: string) {
  return toWardrobeItem(await apiGet<ServerWardrobeItem>(`/v1/wardrobe-items/${id}`));
}

export async function updateWardrobeItem(id: string, body: UpdateWardrobeItemBody) {
  return toWardrobeItem(
    await apiPatch<ServerWardrobeItem>(`/v1/wardrobe-items/${id}`, {
      title: body.name,
      category: body.category,
      color_main: body.color,
      status: body.status,
      location: body.location,
      sub_category: body.subCategory,
      color_secondary: body.colorSecondary,
      material: body.material,
      season_tags: body.seasonTags,
      style_tags: body.styleTags,
      formality_score: body.formalityScore,
      time_cost_level: body.timeCostLevel,
      purchase_price: body.purchasePrice,
    }),
  );
}

export async function updateWardrobeItemFit(id: string, body: UpdateFitBody) {
  return toWardrobeItem(
    await apiPatch<ServerWardrobeItem>(`/v1/wardrobe-items/${id}/fit`, {
      size_label: body.sizeLabel,
      size_region: body.sizeRegion,
      fit_intent: body.fitIntent,
      fit_status: body.fitStatus,
      comfort_score: body.comfortScore,
    }),
  );
}

export function deleteWardrobeItem(id: string) {
  return apiDelete<{ deleted: boolean }>(`/v1/wardrobe-items/${id}`);
}
