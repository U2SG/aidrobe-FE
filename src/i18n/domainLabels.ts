import type { FitIntent, FitStatus, ItemCategory, ItemStatus } from '@/types/api';
import type { AppLocale } from '@/utils/locale';

// Domain enum → display label. Stable enum values stay English on the wire; the
// user must NEVER see a raw value like `top` / `wearable` / `safe`. Lookups are
// guarded against unknown server values (the unions carry string escape hatches)
// and fall back to the humanized raw value rather than throwing.

export type EnumLabelKind =
  | 'category'
  | 'status'
  | 'fitStatus'
  | 'fitIntent'
  | 'variant'
  | 'season'
  | 'occasion'
  | 'color';

// FE#39 quick-edit option sets. season → season_tags, occasion → style_tags on
// the wire (both free-form string arrays server-side; we curate a stable set for
// tap-to-edit and still localize any other value via humanize()).
export const SEASON_VALUES = ['spring', 'summer', 'autumn', 'winter'] as const;
export const OCCASION_VALUES = [
  'casual',
  'office',
  'formal',
  'sport',
  'date',
  'travel',
  'home',
] as const;
export type SeasonTag = (typeof SEASON_VALUES)[number];
export type OccasionTag = (typeof OCCASION_VALUES)[number];

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

const SEASON: LocaleMap<SeasonTag> = {
  'zh-CN': { spring: '春', summer: '夏', autumn: '秋', winter: '冬' },
  'en-US': { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' },
};

const OCCASION: LocaleMap<OccasionTag> = {
  'zh-CN': {
    casual: '休闲',
    office: '通勤',
    formal: '正式',
    sport: '运动',
    date: '约会',
    travel: '旅行',
    home: '居家',
  },
  'en-US': {
    casual: 'Casual',
    office: 'Office',
    formal: 'Formal',
    sport: 'Sport',
    date: 'Date',
    travel: 'Travel',
    home: 'Home',
  },
};

// OutfitVariant carries a `(string & {})` escape hatch, so type the known keys.
const VARIANT: Record<AppLocale, Record<'safe' | 'fast' | 'stylish', string>> = {
  'zh-CN': { safe: '稳妥', fast: '快速', stylish: '有风格' },
  'en-US': { safe: 'Safe', fast: 'Fast', stylish: 'Stylish' },
};

const COLOR: Record<AppLocale, Record<string, string>> = {
  'zh-CN': {
    white: '白色',
    black: '黑色',
    beige: '米色',
    blue: '蓝色',
    brown: '棕色',
    gray: '灰色',
    grey: '灰色',
    green: '绿色',
    red: '红色',
    pink: '粉色',
    purple: '紫色',
    yellow: '黄色',
    orange: '橙色',
    navy: '藏青色',
    cream: '奶油色',
  },
  'en-US': {
    white: 'White',
    black: 'Black',
    beige: 'Beige',
    blue: 'Blue',
    brown: 'Brown',
    gray: 'Gray',
    grey: 'Grey',
    green: 'Green',
    red: 'Red',
    pink: 'Pink',
    purple: 'Purple',
    yellow: 'Yellow',
    orange: 'Orange',
    navy: 'Navy',
    cream: 'Cream',
  },
};

// Humanize an unknown enum value so a raw `snake_case` token never reaches the
// user verbatim.
function humanize(value: string): string {
  return value.replace(/[_-]/g, ' ');
}

function normalizedFreeform(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function looksLikeEnglishToken(value: string): boolean {
  return /[a-z]/i.test(value) && /^[a-z0-9\s_-]+$/i.test(value);
}

const KNOWN_SUBTYPE_LABELS: Record<string, Record<AppLocale, string>> = {
  sneaker: { 'zh-CN': '运动鞋', 'en-US': 'Sneakers' },
  sneakers: { 'zh-CN': '运动鞋', 'en-US': 'Sneakers' },
  trainer: { 'zh-CN': '运动鞋', 'en-US': 'Trainers' },
  trainers: { 'zh-CN': '运动鞋', 'en-US': 'Trainers' },
  tee: { 'zh-CN': 'T 恤', 'en-US': 'T-shirt' },
  tshirt: { 'zh-CN': 'T 恤', 'en-US': 'T-shirt' },
  t_shirt: { 'zh-CN': 'T 恤', 'en-US': 'T-shirt' },
  jeans: { 'zh-CN': '牛仔裤', 'en-US': 'Jeans' },
  blazer: { 'zh-CN': '西装外套', 'en-US': 'Blazer' },
  hoodie: { 'zh-CN': '连帽衫', 'en-US': 'Hoodie' },
};

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

export function tSeason(locale: AppLocale, value: string | null | undefined): string {
  return lookup(SEASON, locale, value);
}

export function tOccasion(locale: AppLocale, value: string | null | undefined): string {
  return lookup(OCCASION, locale, value);
}

export function tVariant(locale: AppLocale, value: string | null | undefined): string {
  if (!value) return '';
  const table = VARIANT[locale] as Record<string, string>;
  return table[value] ?? humanize(value);
}

export function tColor(locale: AppLocale, value: string | null | undefined): string {
  if (!value) return '';
  const raw = value.trim();
  if (!raw) return '';
  const key = normalizedFreeform(raw);
  const table = COLOR[locale] as Record<string, string>;
  const direct = table[key] ?? table[key.replace(/_/g, ' ')];
  if (direct) return direct;
  if (locale === 'zh-CN' && looksLikeEnglishToken(raw)) return '其他颜色';
  return humanize(raw);
}

// Filter-chip variant of tColor. The single-item `'其他颜色'` fallback collapses
// every out-of-catalogue color (teal / burgundy / …) onto one indistinguishable
// label, so a color filter would show multiple chips with the same text selecting
// different raw values. Here each distinct raw color must read distinctly, so we
// keep the localized name when the color is catalogued and otherwise disambiguate
// with the raw value (zh-CN keeps the localized prefix, e.g. `其他颜色（teal）`).
// en-US is byte-identical to tColor (it already humanizes the raw value).
export function tColorFilterLabel(
  locale: AppLocale,
  value: string | null | undefined,
): string {
  if (!value) return '';
  const raw = value.trim();
  if (!raw) return '';
  const key = normalizedFreeform(raw);
  const table = COLOR[locale] as Record<string, string>;
  const direct = table[key] ?? table[key.replace(/_/g, ' ')];
  if (direct) return direct;
  if (locale === 'zh-CN' && looksLikeEnglishToken(raw)) return `其他颜色（${raw}）`;
  return humanize(raw);
}

function knownSubtypeLabel(
  locale: AppLocale,
  values: (string | null | undefined)[],
): string {
  for (const value of values) {
    if (!value) continue;
    const label = KNOWN_SUBTYPE_LABELS[normalizedFreeform(value)]?.[locale];
    if (label) return label;
  }
  return '';
}

function deterministicItemDisplayName(
  locale: AppLocale,
  args: {
    name?: string | null;
    category?: string | null;
    color?: string | null;
    subCategory?: string | null;
  },
): string {
  const typeLabel =
    knownSubtypeLabel(locale, [args.subCategory, args.name]) ||
    tCategory(locale, args.category);
  const colorLabel = tColor(locale, args.color);

  if (colorLabel && typeLabel) {
    return locale === 'zh-CN' ? `${colorLabel}${typeLabel}` : `${colorLabel} ${typeLabel}`;
  }
  return typeLabel || colorLabel;
}

// Item display-name fallback (BE#30/BE#64): user custom name →
// localized_names[locale] → server display_name → FE deterministic fallback →
// existing name/title. `name_source === 'user'` (or 'custom') means the user
// named it, so prefer the stored name as-is. The deterministic fallback is only
// a resilience layer for old/un-backfilled rows; BE-provided names win when set.
export function resolveItemDisplayName(
  locale: AppLocale,
  args: {
    name?: string | null;
    nameSource?: string | null;
    displayName?: string | null;
    localizedNames?: Record<string, string> | null;
    category?: string | null;
    color?: string | null;
    subCategory?: string | null;
  },
): string {
  const { name, nameSource, displayName, localizedNames } = args;
  const userNamed = nameSource === 'user' || nameSource === 'custom';
  if (userNamed && name) return name;
  const short = locale.split('-')[0];
  const localized =
    localizedNames?.[locale] ?? (short ? localizedNames?.[short] : undefined);
  const deterministic = deterministicItemDisplayName(locale, args);
  return localized ?? displayName ?? (deterministic || name || '');
}
