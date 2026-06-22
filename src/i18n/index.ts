import type { AppLocale } from '@/utils/locale';

import { enUS } from './en-US';
import { zhCN, type I18nKey } from './zh-CN';

export type { I18nKey };

const CATALOGUES: Record<AppLocale, Record<I18nKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export type TParams = Record<string, string | number>;

// Translate a key for a locale, interpolating `{name}` placeholders. Falls back
// to the zh-CN string (the source catalogue) if a locale somehow lacks the key,
// and finally to the raw key — translation never throws or renders blank.
export function translate(locale: AppLocale, key: I18nKey, params?: TParams): string {
  const template = CATALOGUES[locale][key] ?? zhCN[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}
