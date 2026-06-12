import { apiGet } from './client';
import type {
  OutfitHistoryEntry,
  OutfitHistoryQuery,
  ServerOutfitHistoryItem,
  ServerOutfitHistoryResponse,
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
