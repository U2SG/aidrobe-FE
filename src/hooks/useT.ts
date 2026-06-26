import { useCallback, useMemo } from 'react';

import { translate, type I18nKey, type TParams } from '@/i18n';
import {
  tCategory,
  tColor,
  tFitIntent,
  tFitStatus,
  tOccasion,
  tSeason,
  tStatus,
  tVariant,
  type EnumLabelKind,
} from '@/i18n/domainLabels';
import { useLocalePrefStore } from '@/store/localePref';
import { resolveLocale, type AppLocale } from '@/utils/locale';

export interface UseT {
  /** Concrete render locale ('zh-CN' | 'en-US'), 'system' already resolved. */
  locale: AppLocale;
  /** Translate a UI string key, interpolating `{name}` params. */
  t: (key: I18nKey, params?: TParams) => string;
  /** Localize a domain enum/free-form display value (category/status/color/etc.). */
  tEnum: (kind: EnumLabelKind, value: string | null | undefined) => string;
}

// Single hook every screen uses. Subscribes to the persisted language store so
// switching the language in Settings re-renders all consumers instantly (no
// server round-trip needed for UI strings or enum labels).
export function useT(): UseT {
  const preference = useLocalePrefStore((s) => s.preference);
  const locale = resolveLocale(preference);

  const t = useCallback(
    (key: I18nKey, params?: TParams) => translate(locale, key, params),
    [locale],
  );

  const tEnum = useCallback(
    (kind: EnumLabelKind, value: string | null | undefined): string => {
      switch (kind) {
        case 'category':
          return tCategory(locale, value);
        case 'status':
          return tStatus(locale, value);
        case 'fitStatus':
          return tFitStatus(locale, value);
        case 'fitIntent':
          return tFitIntent(locale, value);
        case 'variant':
          return tVariant(locale, value);
        case 'season':
          return tSeason(locale, value);
        case 'occasion':
          return tOccasion(locale, value);
        case 'color':
          return tColor(locale, value);
        default:
          return value ?? '';
      }
    },
    [locale],
  );

  return useMemo(() => ({ locale, t, tEnum }), [locale, t, tEnum]);
}
