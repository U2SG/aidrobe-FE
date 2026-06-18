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
