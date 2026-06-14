import { apiDelete, apiGet, apiPatch, apiPost } from './client';
import type {
  AddInspirationBody,
  Inspiration,
  InspirationList,
  InspirationListQuery,
  PdfStyleSourceBody,
  PdfStyleSourceResult,
  ServerBatchInspirationResponse,
  ServerInspirationListResponse,
  ServerInspirationResponse,
  ServerPdfStyleSourceResponse,
} from '@/types/api';

// V4 M18/M19 — style inspiration board + async PDF/magazine ingest.
function toInspiration(p: ServerInspirationResponse): Inspiration {
  return {
    id: p.id,
    imageUrl: p.image_url ?? null,
    sourceUrl: p.source_url ?? null,
    sourceType: p.source_type,
    learnStatus: p.learn_status ?? 'learned',
    createdAt: p.created_at,
  };
}

export async function addInspiration(body: AddInspirationBody): Promise<Inspiration> {
  return toInspiration(
    await apiPost<ServerInspirationResponse>('/v1/style/inspirations', {
      image_url: body.imageUrl ?? null,
      source_url: body.sourceUrl ?? null,
    }),
  );
}

export async function addInspirationsBatch(urls: string[]): Promise<Inspiration[]> {
  const data = await apiPost<ServerBatchInspirationResponse>('/v1/style/sources/batch', { urls });
  return data.items.map(toInspiration);
}

// Gated by ENABLE_PDF_STYLE_INGEST — returns 503 when off. `estimated_pages`
// is best-effort 0 at enqueue; the real count is known after the worker runs.
export async function addPdfStyleSource(body: PdfStyleSourceBody): Promise<PdfStyleSourceResult> {
  const data = await apiPost<ServerPdfStyleSourceResponse>('/v1/style/sources', {
    file_url: body.fileUrl,
    input_type: 'pdf_magazine',
    title: body.title ?? null,
  });
  return {
    sourceId: data.source_id,
    status: data.status,
    estimatedPages: data.estimated_pages,
  };
}

export async function listInspirations(query: InspirationListQuery = {}): Promise<InspirationList> {
  const data = await apiGet<ServerInspirationListResponse>('/v1/style/inspirations', {
    limit: query.limit ?? 20,
    offset: query.offset ?? 0,
  });
  return {
    items: data.items.map(toInspiration),
    limit: data.limit,
    offset: data.offset,
  };
}

export function deleteInspiration(id: string) {
  return apiDelete<null>(`/v1/style/inspirations/${id}`);
}

// Upserts the user's global style tags.
export function updateStyleTags(tags: string[]) {
  return apiPatch<null>('/v1/style/tags', { tags });
}
