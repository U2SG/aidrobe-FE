import { apiGet, apiPost } from './client';
import type {
  ConfirmImportTaskBody,
  CreateImportTaskBody,
  ImportTask,
  ServerImportTask,
} from '@/types/api';

function toImportTask(task: ServerImportTask): ImportTask {
  return {
    id: task.task_id,
    status: task.status,
    imageUrl: task.candidate_item?.original_image_url ?? null,
    recognized: task.candidate_item
      ? {
          name: task.candidate_item.title,
          category: task.candidate_item.category,
          color: task.candidate_item.color_main,
          confidenceScore: task.candidate_item.confidence_score,
        }
      : undefined,
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
