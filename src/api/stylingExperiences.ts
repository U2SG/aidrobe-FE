import { apiDelete, apiGet, apiPost } from './client';

export type ExperienceKind = 'appreciated' | 'want_to_try' | 'wear_feedback';
export type WearFeeling = 'like' | 'neutral' | 'dislike';

export interface StylingExperience {
  experience_id: string;
  request_id: string;
  outfit_id: string;
  kind: ExperienceKind;
  conversation_id: string | null;
  revision: number | null;
  worn_date: string | null;
  feedback: WearFeeling | null;
  note: string | null;
  occasion: string | null;
  created_at: string;
  supersedes_id: string | null;
}

export interface StylingExperiences {
  items: StylingExperience[];
  latest_worn_date: string | null;
}

export interface CreateStylingExperience {
  request_id: string;
  outfit_id: string;
  kind: ExperienceKind;
  conversation_id?: string;
  revision?: number;
  worn_date?: string;
  feedback?: WearFeeling;
  note?: string;
  supersedes_id?: string;
}

export function getStylingExperiences(outfitId: string): Promise<StylingExperiences> {
  return apiGet('/v1/styling-experiences', { outfit_id: outfitId, limit: 100 }, { silentErrorToast: true });
}

export function createStylingExperience(body: CreateStylingExperience): Promise<StylingExperience> {
  return apiPost('/v1/styling-experiences', body, undefined, { silentErrorToast: true });
}

export function deleteStylingExperience(id: string): Promise<{ success: boolean }> {
  return apiDelete('/v1/styling-experiences/' + id, { silentErrorToast: true });
}
