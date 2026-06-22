// Best-effort device locale for Ask language control. Zero-dep: Hermes ships
// Intl, whose resolved locale reflects the device language (e.g. "en-US",
// "zh-CN"). The backend only distinguishes the language subtag (non-`en`
// falls back to Chinese), so the full BCP-47 tag is fine to pass through.
export function getDeviceLocale(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale || 'zh-CN';
  } catch {
    return 'zh-CN';
  }
}

// The two locales the UI renders. Stable BCP-47 tags also sent to the backend
// (settings.locale, import/ask request locale).
export type AppLocale = 'zh-CN' | 'en-US';
// What the user can pick in Settings; 'system' defers to the device locale.
export type LocalePreference = AppLocale | 'system';

// Map any BCP-47-ish tag to one of the two supported app locales. Anything that
// isn't unambiguously English collapses to Chinese (matches the backend's
// "non-`en` → Chinese" behaviour).
export function normalizeLocale(tag: string | null | undefined): AppLocale {
  const lang = (tag ?? '').toLowerCase().split('-')[0];
  return lang === 'en' ? 'en-US' : 'zh-CN';
}

// Resolve a user preference to a concrete render locale. 'system' reads the
// device locale at call time so it follows OS language changes.
export function resolveLocale(pref: LocalePreference): AppLocale {
  return pref === 'system' ? normalizeLocale(getDeviceLocale()) : pref;
}
