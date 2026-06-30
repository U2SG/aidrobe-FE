import { apiGet, apiPatch, apiPost } from './client';
import type {
  CreatePackingListBody,
  PackingList,
  PackingPlan,
  ServerPackingListResponse,
  ServerPackingPlan,
  UpdatePackingListBody,
} from '@/types/api';

// BE#68 — map the optional planner block (snake → camel). Null when the server's
// ENABLE_PACKING_PLANNER is off, so the FE shows only the flat checklist.
function toPlan(plan: ServerPackingPlan | null | undefined): PackingPlan | null {
  if (!plan) return null;
  return {
    summary: plan.summary,
    weatherSummary: plan.weather_summary ?? null,
    packingItems: plan.packing_items.map((p) => ({ itemId: p.item_id, role: p.role, reason: p.reason })),
    dailyOutfits: plan.daily_outfits.map((d) => ({
      day: d.day,
      occasion: d.occasion,
      itemIds: d.item_ids,
      reasoning: d.reasoning,
    })),
    missingItems: plan.missing_items.map((m) => ({ category: m.category, reason: m.reason })),
  };
}

// V4 M16 — rule-based travel packing list.
function toPackingList(data: ServerPackingListResponse): PackingList {
  return {
    id: data.packing_list_id,
    destination: data.destination ?? null,
    days: data.days ?? null,
    scenes: data.scenes,
    departureDate: data.departure_date ?? null,
    items: data.items.map((it) => ({
      itemId: it.item_id,
      day: it.day,
      scene: it.scene,
      notes: it.notes,
      packed: it.packed,
    })),
    status: data.status,
    plan: toPlan(data.plan),
  };
}

export async function createPackingList(body: CreatePackingListBody): Promise<PackingList> {
  return toPackingList(
    await apiPost<ServerPackingListResponse>('/v1/packing-lists', {
      destination: body.destination ?? null,
      days: body.days,
      scenes: body.scenes,
      weather_hint: body.weatherHint ?? null,
      departure_date: body.departureDate ?? null,
    }),
  );
}

export async function listPackingLists(): Promise<PackingList[]> {
  const data = await apiGet<ServerPackingListResponse[]>('/v1/packing-lists');
  return data.map(toPackingList);
}

export async function getPackingList(id: string): Promise<PackingList> {
  return toPackingList(await apiGet<ServerPackingListResponse>(`/v1/packing-lists/${id}`));
}

export async function updatePackingList(
  id: string,
  body: UpdatePackingListBody,
): Promise<PackingList> {
  return toPackingList(
    await apiPatch<ServerPackingListResponse>(`/v1/packing-lists/${id}`, {
      items: body.items?.map((it) => ({
        item_id: it.itemId,
        day: it.day,
        scene: it.scene,
        notes: it.notes,
        packed: it.packed,
      })),
      status: body.status,
    }),
  );
}
