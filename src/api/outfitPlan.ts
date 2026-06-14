import { apiGet, apiPatch, apiPost } from './client';
import type {
  CalendarDay,
  CreateOutfitPlanBody,
  OutfitPlan,
  ServerCalendarCell,
  ServerCalendarDay,
  ServerOutfitPlanCalendarResponse,
  ServerOutfitPlanResponse,
  ServerWearPlanResponse,
  UpdateOutfitPlanBody,
  WearPlanResult,
} from '@/types/api';

// V4 — plan existing outfits onto a calendar.
function toPlan(data: ServerOutfitPlanResponse): OutfitPlan {
  return {
    id: data.outfit_plan_id,
    outfitId: data.outfit_id,
    plannedDate: data.planned_date,
    status: data.status,
  };
}

function toCell(cell: ServerCalendarCell): CalendarDay['cells'][number] {
  return {
    kind: cell.kind,
    outfit: cell.outfit
      ? {
          outfitId: cell.outfit.outfit_id,
          outfitType: cell.outfit.outfit_type,
          title: cell.outfit.title,
          reason: cell.outfit.reason_text ?? null,
        }
      : null,
    wearHistoryId: cell.wear_history_id ?? null,
    ootdImageUrl: cell.ootd_image_url ?? null,
    outfitPlanId: cell.outfit_plan_id ?? null,
    status: cell.status ?? null,
  };
}

function toDay(day: ServerCalendarDay): CalendarDay {
  return { date: day.date, cells: day.cells.map(toCell) };
}

// `start` / `end` are inclusive YYYY-MM-DD bounds.
export async function getOutfitCalendar(start: string, end: string): Promise<CalendarDay[]> {
  const data = await apiGet<ServerOutfitPlanCalendarResponse>('/v1/outfit-plans/calendar', {
    start,
    end,
  });
  return data.days.map(toDay);
}

export async function createOutfitPlan(body: CreateOutfitPlanBody): Promise<OutfitPlan> {
  return toPlan(
    await apiPost<ServerOutfitPlanResponse>('/v1/outfit-plans', {
      outfit_id: body.outfitId,
      planned_date: body.plannedDate,
    }),
  );
}

export async function updateOutfitPlan(
  id: string,
  body: UpdateOutfitPlanBody,
): Promise<OutfitPlan> {
  return toPlan(
    await apiPatch<ServerOutfitPlanResponse>(`/v1/outfit-plans/${id}`, {
      planned_date: body.plannedDate,
      status: body.status,
    }),
  );
}

// Server derives the worn date (today) — no body. Consumes the plan
// (returned status is "cancelled") and writes an idempotent wear-history row.
export async function markPlanWorn(id: string): Promise<WearPlanResult> {
  const data = await apiPost<ServerWearPlanResponse>(`/v1/outfit-plans/${id}/wear`);
  return {
    outfitPlanId: data.outfit_plan_id,
    wearHistoryId: data.wear_history_id,
    wornDate: data.worn_date,
    status: data.status,
  };
}
