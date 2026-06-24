import type { I18nMessage, ServerI18nMessage } from '@/types/api';

export function toI18nMessage(s: ServerI18nMessage): I18nMessage {
  return {
    key: s.key,
    params: s.params,
    fallbackText: s.fallback_text,
  };
}

// Render an I18nMessage. We don't have a translation catalogue yet, so we always
// return fallback_text — but the API contract treats `key` as the source of truth
// for future locale bundles. Wire a real lookup table here when we add i18n.
// API_GAP[untracked]: no published I18nMessage.key catalogue from BE.
// Fallback: return fallback_text, ignore key. See docs/api-gaps.md.
export function renderI18n(msg: I18nMessage | null | undefined): string {
  if (!msg) return '';
  return msg.fallbackText;
}
