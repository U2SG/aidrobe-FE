import { create } from 'zustand';
import type { ItemCategory } from '@/types/api';

/**
 * 添加衣物 / 导入流程的本地草稿
 * 不持久化（V1 Slim 不持久化衣物数据）
 */
interface ImportDraftState {
  taskId: string | null;
  localImageUri: string | null;
  recognized: {
    name?: string;
    category?: ItemCategory;
    color?: string;
  } | null;
  set: (patch: Partial<Omit<ImportDraftState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

export const useImportDraftStore = create<ImportDraftState>((set) => ({
  taskId: null,
  localImageUri: null,
  recognized: null,
  set: (patch) => set(patch),
  reset: () => set({ taskId: null, localImageUri: null, recognized: null }),
}));
