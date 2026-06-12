import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastPayload {
  message: string;
  kind?: ToastKind;
  durationMs?: number;
}

interface ToastState {
  current: ToastPayload | null;
  show: (payload: ToastPayload) => void;
  dismiss: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (payload) => set({ current: { kind: 'info', durationMs: 2500, ...payload } }),
  dismiss: () => set({ current: null }),
}));
