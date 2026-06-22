import { apiGet, apiPost } from './client';
import type {
  ConfirmImportItemBody,
  ConfirmImportTaskBody,
  CreateImportTaskBody,
  ImportCandidateItem,
  ImportTask,
  ServerImportCandidate,
  ServerImportTask,
} from '@/types/api';

function toCandidate(c: ServerImportCandidate): ImportCandidateItem {
  return {
    tempItemId: c.temp_item_id ?? null,
    // Prefer the localized display name (BE#30), then the raw title/name.
    name: c.display_name ?? c.title ?? c.name ?? '',
    category: c.category,
    colorMain: c.color_main,
    confidenceScore: c.confidence_score ?? undefined,
    // Thumbnail prefers the polished cutout, then crop, then the raw photo.
    imageUrl: c.cutout_image_url ?? c.crop_image_url ?? c.original_image_url ?? null,
    shouldImport: c.should_import ?? true,
  };
}

function toImportTask(task: ServerImportTask): ImportTask {
  // BE#24: prefer the candidate_items list; fall back to wrapping the legacy
  // single candidate_item into a length-1 list so old payloads still render.
  const candidateItems: ImportCandidateItem[] =
    task.candidate_items && task.candidate_items.length > 0
      ? task.candidate_items.map(toCandidate)
      : task.candidate_item
        ? [
            {
              tempItemId: null,
              name: task.candidate_item.title,
              category: task.candidate_item.category,
              colorMain: task.candidate_item.color_main,
              confidenceScore: task.candidate_item.confidence_score,
              imageUrl: task.candidate_item.original_image_url ?? null,
              shouldImport: true,
            },
          ]
        : [];
  return {
    id: task.task_id,
    status: task.status,
    imageUrl: task.candidate_item?.original_image_url ?? candidateItems[0]?.imageUrl ?? null,
    recognized: task.candidate_item
      ? {
          name: task.candidate_item.title,
          category: task.candidate_item.category,
          color: task.candidate_item.color_main,
          confidenceScore: task.candidate_item.confidence_score,
        }
      : undefined,
    candidateItems,
    errorReason: task.status === 'failed' ? 'recognition_failed' : undefined,
    errorMessage: task.error_message ?? null,
  };
}

export async function createImportTask(body: CreateImportTaskBody) {
  return toImportTask(
    await apiPost<ServerImportTask>('/v1/import-tasks', {
      input_type: body.inputType,
      source_type: body.sourceType,
      image_url: body.imageUrl,
      source_url: body.sourceUrl,
      locale: body.locale ?? null,
    }),
  );
}

export async function getImportTask(id: string) {
  return toImportTask(await apiGet<ServerImportTask>(`/v1/import-tasks/${id}`));
}

export function confirmImportTask(id: string, body: ConfirmImportTaskBody) {
  return apiPost<{ item_id: string }>(`/v1/import-tasks/${id}/confirm`, {
    title: body.name,
    category: body.category,
    color_main: body.color,
    location: body.location,
    size_label: body.sizeLabel,
    fit_status: body.fitStatus,
  });
}

// BE#25 — batch-confirm a selected subset of a task's candidate_items.
export function confirmImportTaskItems(id: string, items: ConfirmImportItemBody[]) {
  return apiPost<{ created_items: { temp_item_id: string; item_id: string }[] }>(
    `/v1/import-tasks/${id}/confirm-items`,
    {
      items: items.map((it) => ({
        temp_item_id: it.tempItemId,
        title: it.title,
        category: it.category,
        color_main: it.color,
        location: it.location ?? null,
        size_label: it.sizeLabel ?? null,
        fit_status: it.fitStatus ?? null,
      })),
    },
  );
}
