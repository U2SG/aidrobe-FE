import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { enableV3Avatar } from '@/lib/featureFlags';
import {
  hasBeenPrompted,
  initialAvatarCandidatePromptState,
  recordPrompted,
  type AvatarCandidatePromptState,
} from '@/state/avatarCandidatePrompt';

// V3-014 — persisted "already asked about this candidate" ledger, plus the
// in-memory arm that a completed source flow sets. The gating logic lives in
// the pure module (src/state/avatarCandidatePrompt.ts); this is storage +
// `Date.now()` plumbing. See that module for why this is separate from
// `promptFrequency`.
//
// `armedAt` is deliberately NOT persisted (`partialize` keeps only the ledger).
// It means "a source flow completed in this session"; surviving a restart would
// let a sheet open over an unrelated screen on next launch, which fails
// acceptance 1 in substance — the prompt must belong to the flow that earned
// it, not merely follow one at some point in the past.
//
// It is a timestamp rather than a boolean because re-arming has to restart a
// poll that may still be running: the host keys its effect on this value, so a
// second completed flow supersedes the first instead of being swallowed.

interface AvatarCandidatePromptStore extends AvatarCandidatePromptState {
  hydrated: boolean;
  armedAt: number | null;
  /**
   * Called by a source flow the moment it SUCCEEDS, and — for a batch — only
   * once the whole batch is done (V3_SPEC §7.3 forbids repeated prompting, and
   * an album import fans out one detection per image).
   *
   * Arms a question and nothing else: contract §4.3 is explicit that importing
   * clothes never implies person-reference consent.
   */
  armSourceFlow: () => void;
  /** Close the window: consumed, expired, or abandoned. Idempotent. */
  disarm: () => void;
  markPrompted: (sourceAssetId: string) => void;
  wasPrompted: (sourceAssetId: string) => boolean;
  _setHydrated: () => void;
}

export const useAvatarCandidatePromptStore = create<AvatarCandidatePromptStore>()(
  persist(
    (set, get) => ({
      ...initialAvatarCandidatePromptState(),
      hydrated: false,
      armedAt: null,
      armSourceFlow: () => set({ armedAt: Date.now() }),
      disarm: () => set({ armedAt: null }),
      markPrompted: (sourceAssetId) => set((s) => recordPrompted(s, sourceAssetId)),
      wasPrompted: (sourceAssetId) => hasBeenPrompted(get(), sourceAssetId),
      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'aidrobe.avatarCandidatePrompt',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ promptedAssetIds: s.promptedAssetIds }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated();
      },
    },
  ),
);

/**
 * Arm from a non-React call site (an async success handler) without
 * subscribing the caller to this store.
 *
 * The flag is checked HERE, not only in the host, so that with
 * `ENABLE_V3_AVATAR` off the V2 OOTD and import flows do not so much as write
 * a field — they are byte-for-byte their pre-V3 selves.
 */
export function armAvatarSourceFlow(): void {
  if (!enableV3Avatar) return;
  useAvatarCandidatePromptStore.getState().armSourceFlow();
}
