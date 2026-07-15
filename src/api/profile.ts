import { apiDelete, apiGet, apiPost } from './client';

// BE#83 — profile data-trust surface. All endpoints are flag-gated on the BE
// (ENABLE_DATA_TRUST); a flag-off backend answers 403, which callers render as
// an honest "unavailable" state rather than an error toast.

export interface ServerMemoryItem {
  id: string;
  type: string;
  label: string;
  polarity: string;
  source: 'explicit' | 'feedback' | 'inferred';
  confidence: 'low' | 'medium' | 'high';
  created_at: string;
}

export interface MemoryItem {
  id: string;
  type: string;
  label: string;
  polarity: string;
  source: 'explicit' | 'feedback' | 'inferred';
  confidence: 'low' | 'medium' | 'high';
  createdAt: string;
}

function toMemoryItem(item: ServerMemoryItem): MemoryItem {
  return {
    id: item.id,
    type: item.type,
    label: item.label,
    polarity: item.polarity,
    source: item.source,
    confidence: item.confidence,
    createdAt: item.created_at,
  };
}

export async function getLearnedMemory(): Promise<MemoryItem[]> {
  const data = await apiGet<{ preferences: ServerMemoryItem[] }>(
    '/v1/profile/memory',
    undefined,
    // Flag-off backends 403 — the screen shows its unavailable copy instead.
    { silentErrorToast: true },
  );
  return data.preferences.map(toMemoryItem);
}

export async function deleteMemoryItem(id: string): Promise<void> {
  await apiDelete(`/v1/profile/memory/${id}`);
}

/** "这不准" — same removal as delete, but audited as a correction signal. */
export async function markMemoryWrong(id: string): Promise<void> {
  await apiPost(`/v1/profile/memory/${id}/mark-wrong`);
}

export async function clearLearnedMemory(): Promise<number> {
  const data = await apiDelete<{ deleted: number }>('/v1/profile/memory');
  return data.deleted;
}

/** Clear ALL app data while keeping the account (BE wipes every user-owned
 * table and invalidates the Today cache; audit trail survives server-side). */
export async function clearAllData(): Promise<number> {
  const data = await apiDelete<{ cleared_rows: number }>('/v1/profile/data');
  return data.cleared_rows;
}
