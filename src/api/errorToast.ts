// Decides whether a failed request should surface the global error toast.
//
// Lives in its own runtime-import-free module so the decision is unit-testable
// under Node type-stripping (scripts/errorToast.test.ts) — importing client.ts
// would pull in axios / expo-constants / zustand stores, none of which load.
//
// A request opts out of the global toast by setting `silentErrorToast: true`
// on its axios config (see the module augmentation in client.ts). This is used
// by optional / feature-flagged cards (e.g. getWardrobeHealth) whose surface
// already omits itself on error and so must fail quietly.

export interface ToastSilenceableError {
  config?: { silentErrorToast?: boolean };
}

export function isErrorToastSilenced(error: ToastSilenceableError | undefined | null): boolean {
  return Boolean(error?.config?.silentErrorToast);
}
