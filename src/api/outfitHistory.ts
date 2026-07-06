import { apiGet, apiPost } from './client';
import type {
  OutfitHistoryEntry,
  OutfitHistoryQuery,
  ServerOutfitHistoryItem,
  ServerOutfitHistoryResponse,
  ServerWearHistoryEntry,
  WearHistoryEntry,
} from '@/types/api';

function toEntry(item: ServerOutfitHistoryItem): OutfitHistoryEntry {
  return {
    outfitId: item.outfit_id,
    wornDate: item.worn_date,
    outfitType: item.outfit_type,
    title: item.title,
    feedbackType: item.feedback_type ?? null,
    reasonTags: item.reason_tags ?? [],
  };
}

export async function getOutfitHistory(query: OutfitHistoryQuery = {}) {
  const data = await apiGet<ServerOutfitHistoryResponse>(
    '/v1/recommendations/outfit-history',
    {
      start_date: query.startDate,
      end_date: query.endDate,
      limit: query.limit ?? 60,
      offset: query.offset ?? 0,
    },
  );
  return {
    items: data.items.map(toEntry),
    limit: data.limit,
    offset: data.offset,
  };
}

// Wear-history record for one date. 404 when nothing was marked worn that day
// — callers probing (e.g. the OOTD attach) should silence the toast and treat
// it as "no record".
export async function getWearHistoryByDate(
  wornDate: string,
  opts?: { silentErrorToast?: boolean },
): Promise<WearHistoryEntry> {
  const data = await apiGet<ServerWearHistoryEntry>(`/v1/outfit-history/${wornDate}`, undefined, {
    silentErrorToast: opts?.silentErrorToast,
  });
  return {
    wearHistoryId: data.wear_history_id,
    wornDate: data.worn_date,
    outfit: data.outfit
      ? {
          outfitId: data.outfit.outfit_id,
          outfitType: data.outfit.outfit_type,
          title: data.outfit.title ?? null,
          reasonText: data.outfit.reason_text ?? null,
        }
      : null,
    ootdImageUrl: data.ootd_image_url ?? null,
    selectedAt: data.selected_at,
  };
}

// Attach an OOTD photo to a wear-history record so history/calendar surfaces
// the real look, and posters can later be re-generated from it.
export function uploadOotdPhoto(
  wearHistoryId: string,
  ootdImageUrl: string,
  opts?: { silentErrorToast?: boolean },
) {
  return apiPost<{ wear_history_id: string; ootd_image_url: string }>(
    `/v1/outfit-history/${wearHistoryId}/ootd`,
    { ootd_image_url: ootdImageUrl },
    undefined,
    { silentErrorToast: opts?.silentErrorToast },
  );
}
