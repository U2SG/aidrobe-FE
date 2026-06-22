import type { FitIntent, FitStatus, ItemCategory, ItemStatus } from '@/types/api';
import type { AppLocale } from '@/utils/locale';

// Domain enum → display label. Stable enum values stay English on the wire; the
// user must NEVER see a raw value like `top` / `wearable` / `safe`. Lookups are
// guarded against unknown server values (the unions carry string escape hatches)
// and fall back to the humanized raw value rather than throwing.

export type EnumLabelKind = 'category' | 'status' | 'fitStatus' | 'fitIntent' | 'variant';

type LocaleMap<K extends string> = Record<AppLocale, Record<K, string>>;

const CATEGORY: LocaleMap<ItemCategory> = {
  'zh-CN': {
    top: '上衣',
    bottom: '下装',
    outerwear: '外套',
    dress: '连衣裙',
    shoes: '鞋',
    accessory: '配饰',
    other: '其他',
  },
  'en-US': {
    top: 'Top',
    bottom: 'Bottom',
    outerwear: 'Outerwear',
    dress: 'Dress',
    shoes: 'Shoes',
    accessory: 'Accessory',
    other: 'Other',
  },
};

const STATUS: LocaleMap<ItemStatus> = {
  'zh-CN': {
    wearable: '可穿',
    unavailable: '不可穿',
    dirty: '待洗',
    lost: '遗失',
    donated: '已捐赠',
  },
  'en-US': {
    wearable: 'Wearable',
    unavailable: 'Unavailable',
    dirty: 'Laundry',
    lost: 'Lost',
    donated: 'Donated',
  },
};

const FIT_STATUS: LocaleMap<FitStatus> = {
  'zh-CN': {
    unknown: '未知',
    fits_well: '合身',
    loose: '偏松',
    tight: '偏紧',
    oversized_ok: '宽松正好',
    needs_alteration: '需修改',
    no_longer_fits: '已不合身',
  },
  'en-US': {
    unknown: 'Unknown',
    fits_well: 'Fits well',
    loose: 'Loose',
    tight: 'Tight',
    oversized_ok: 'Oversized OK',
    needs_alteration: 'Needs alteration',
    no_longer_fits: 'No longer fits',
  },
};

const FIT_INTENT: LocaleMap<FitIntent> = {
  'zh-CN': {
    regular: '常规',
    fitted: '修身',
    relaxed: '宽松',
    oversized: '超大廓形',
    cropped: '短款',
    longline: '长款',
    wide_leg: '阔腿',
    straight: '直筒',
    slim: '紧身',
  },
  'en-US': {
    regular: 'Regular',
    fitted: 'Fitted',
    relaxed: 'Relaxed',
    oversized: 'Oversized',
    cropped: 'Cropped',
    longline: 'Longline',
    wide_leg: 'Wide leg',
    straight: 'Straight',
    slim: 'Slim',
  },
};

// OutfitVariant carries a `(string & {})` escape hatch, so type the known keys.
const VARIANT: Record<AppLocale, Record<'safe' | 'fast' | 'stylish', string>> = {
  'zh-CN': { safe: '稳妥', fast: '快速', stylish: '有风格' },
  'en-US': { safe: 'Safe', fast: 'Fast', stylish: 'Stylish' },
};

// Humanize an unknown enum value so a raw `snake_case` token never reaches the
// user verbatim.
function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

function lookup<K extends string>(
  map: LocaleMap<K>,
  locale: AppLocale,
  value: string | null | undefined,
): string {
  if (!value) return '';
  const table = map[locale] as Record<string, string>;
  return table[value] ?? humanize(value);
}

export function tCategory(locale: AppLocale, value: string | null | undefined): string {
  return lookup(CATEGORY, locale, value);
}

export function tStatus(locale: AppLocale, value: string | null | undefined): string {
  return lookup(STATUS, locale, value);
}

export function tFitStatus(locale: AppLocale, value: string | null | undefined): string {
  return lookup(FIT_STATUS, locale, value);
}

export function tFitIntent(locale: AppLocale, value: string | null | undefined): string {
  return lookup(FIT_INTENT, locale, value);
}

export function tVariant(locale: AppLocale, value: string | null | undefined): string {
  if (!value) return '';
  const table = VARIANT[locale] as Record<string, string>;
  return table[value] ?? humanize(value);
}

// Item display-name fallback (BE#30): user custom name → server display_name →
// localized_names[locale] → existing name/title. `name_source === 'user'` (or
// 'custom') means the user named it, so prefer the stored name as-is.
export function resolveItemDisplayName(
  locale: AppLocale,
  args: {
    name?: string | null;
    nameSource?: string | null;
    displayName?: string | null;
    localizedNames?: Record<string, string> | null;
  },
): string {
  const { name, nameSource, displayName, localizedNames } = args;
  const userNamed = nameSource === 'user' || nameSource === 'custom';
  if (userNamed && name) return name;
  const short = locale.split('-')[0];
  const localized =
    localizedNames?.[locale] ?? (short ? localizedNames?.[short] : undefined);
  return localized ?? displayName ?? name ?? '';
}
