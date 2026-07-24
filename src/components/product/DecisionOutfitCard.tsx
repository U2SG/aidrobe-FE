import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AIOrb } from '@/components/ui/AIOrb';
import { OutfitBoard } from '@/components/outfit/OutfitBoard';
import WeatherWindowBackdrop from '@/components/outfit/WeatherWindowBackdrop';
import type { GarmentPiece } from '@/components/outfit/garments';
import { RecommendationFeedback } from '@/components/feedback/RecommendationFeedback';
import { SystemIcon } from '@/components/ui/SystemIcon';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/i18n';
import { colors, radius, shadow, type } from '@/theme/design';
import type { OutfitSummary, RecommendationReason, WeatherContext } from '@/types/api';

import { RecommendationReasonList } from './RecommendationReasonList';

const TOP_KINDS = new Set<GarmentPiece['kind']>(['shirt', 'sweater', 'tee']);
const BOTTOM_KINDS = new Set<GarmentPiece['kind']>(['trousers', 'jeans', 'skirt']);
const SHOE_KINDS = new Set<GarmentPiece['kind']>(['sneaker', 'loafer']);

function silhouetteRank(piece: GarmentPiece): number {
  if (TOP_KINDS.has(piece.kind) || piece.kind === 'dress') return 1;
  if (BOTTOM_KINDS.has(piece.kind)) return 2;
  if (SHOE_KINDS.has(piece.kind)) return 3;
  // Outerwear renders LAST: OutfitBoard paints pieces in array order, so the
  // blazer must come after the base top to sit on top of it ("+ 外套").
  if (piece.kind === 'blazer') return 5;
  return 4;
}

/** Today-weather-only layout. The shared flat-lay stays untouched for other flows.

The outerwear is a permanent OVERLAY piece: every garment (blazer included)
renders on every toggle state, and the switch only flips the blazer's `hidden`
flag — an opacity fade inside OutfitPiece. Filtering it out instead would
change the pieces array and remount the whole board (replayed entry animation
plus, on native, a synchronous Skia matte readback per garment). The base top
keeps one geometry; under the jacket the size difference is covered anyway. */
function buildWeatherSilhouette(
  pieces: GarmentPiece[],
  includeOuterwear: boolean,
): GarmentPiece[] {
  return pieces
    .map((piece, sourceIndex) => ({ piece, sourceIndex }))
    .sort(
      (a, b) =>
        silhouetteRank(a.piece) - silhouetteRank(b.piece) || a.sourceIndex - b.sourceIndex,
    )
    .map(({ piece }) => {
      if (piece.kind === 'blazer') {
        return { ...piece, x: 94, y: 64, scale: 1.45, rotate: '0deg', hidden: !includeOuterwear };
      }
      if (TOP_KINDS.has(piece.kind)) {
        return { ...piece, x: 94, y: 68, scale: 1.08, rotate: '0deg' };
      }
      if (piece.kind === 'dress') {
        return { ...piece, x: 94, y: 82, scale: 1.65, rotate: '0deg' };
      }
      if (BOTTOM_KINDS.has(piece.kind)) {
        return { ...piece, x: 94, y: 176, scale: 1.34, rotate: '0deg' };
      }
      if (SHOE_KINDS.has(piece.kind)) {
        return { ...piece, x: 94, y: 306, scale: 0.76, rotate: '0deg' };
      }
      return { ...piece, x: 208, y: 254, scale: 0.58, rotate: '0deg' };
    });
}

type Props = {
  outfit: OutfitSummary;
  pieces: GarmentPiece[];
  reasons: RecommendationReason[];
  /** Real Today/forecast context. Null keeps the stable non-weather card. */
  weather?: WeatherContext | null;
  /** e.g. "28° 多云 · 准备 5 分" — real weather/time hint, may be null. */
  hint?: string | null;
  /** Warm one-line rationale shown in the quote box (from guidanceText). */
  quote?: string | null;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  /** Primary CTA label — mode-aware ("try today" vs "set for tomorrow") so
   *  evening/late-night never shows stale "wear today" copy (brief §4.4). */
  wearLabelKey?: I18nKey;
  onWear: () => void;
  onSwap: () => void;
  onViewDetail: () => void;
  /** Hidden in the single-outfit cold-start state (swap would always fail). */
  showSwap?: boolean;
  /** Regeneration in flight — the swap link becomes a spinner + "正在换一套…"
   *  so a ~25s wait never looks like a dead tap. Only re-submission is blocked;
   *  every other action on the card stays live. */
  swapBusy?: boolean;
  /** Swap not allowed right now (e.g. a real tomorrow payload) — greyed, no
   *  progress framing. */
  swapDisabled?: boolean;
  /** Outdoor temperature, passed to feedback for indoor-climate signal (§9.2). */
  temperatureC?: number | null;
};

// The one decision outfit for Today v2 (brief v0.9 §5; visual = design handoff
// Today baseline): "今日一套" header + favorite, weather line, flat-lay board,
// 2–3 reasons with source, a warm quote box, one black CTA, and soft text links
// (查看详情 / 不喜欢 / 换一套). "不喜欢" reveals the feedback chips inline.
export function DecisionOutfitCard({
  outfit,
  pieces,
  reasons,
  weather,
  hint,
  quote,
  isFavorited,
  onToggleFavorite,
  wearLabelKey = 'today.v2.wear',
  onWear,
  onSwap,
  onViewDetail,
  showSwap = true,
  swapBusy,
  swapDisabled,
  temperatureC,
}: Props) {
  const { t } = useT();
  const [showFeedback, setShowFeedback] = useState(false);
  const [weatherCardWidth, setWeatherCardWidth] = useState(0);
  const [includeOuterwear, setIncludeOuterwear] = useState(true);
  const hasOuterwear = pieces.some((piece) => piece.kind === 'blazer');
  const displayedPieces = useMemo(
    () => buildWeatherSilhouette(pieces, includeOuterwear),
    [includeOuterwear, pieces],
  );
  const weatherToggleWidth = weatherCardWidth > 0 && weatherCardWidth < 330 ? 136 : 166;
  const weatherRationale = quote?.trim() || reasons[0]?.text || null;

  useEffect(() => {
    setIncludeOuterwear(true);
  }, [hasOuterwear, outfit.id]);
  const rainPercent = weather
    ? Math.round(
        Math.max(
          0,
          Math.min(
            1,
            weather.rainProbability > 1 ? weather.rainProbability / 100 : weather.rainProbability,
          ),
        ) * 100,
      )
    : null;
  const weatherLocationLine = weather
    ? [weather.locationName, weather.condition].filter(Boolean).join(' · ')
    : null;
  return (
    <View
      style={
        weather
          ? { gap: 14 }
          : {
              borderRadius: radius.xl,
              backgroundColor: colors.elevated,
              borderWidth: 1,
              borderColor: colors.separatorSoft,
              padding: 18,
              gap: 14,
              ...shadow.elevated,
            }
      }
    >
      {weather ? (
        <View
          onLayout={(event) => setWeatherCardWidth(event.nativeEvent.layout.width)}
          style={{
            position: 'relative',
            height: 540,
            overflow: 'hidden',
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: 112,
            borderBottomRightRadius: radius.xl,
            borderBottomLeftRadius: 56,
            backgroundColor: '#CFDFEA',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.72)',
            ...shadow.soft,
          }}
        >
          <WeatherWindowBackdrop weather={weather} />

          {hasOuterwear ? (
            <View
              accessibilityRole="tablist"
              style={{
                position: 'absolute',
                top: 20,
                right: 16,
                zIndex: 5,
                width: weatherToggleWidth,
                height: 44,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(255,255,255,0.42)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.72)',
                padding: 3,
                flexDirection: 'row',
              }}
            >
              {[
                { include: false, label: t('today.v2.baseOutfit') },
                { include: true, label: t('today.v2.addOuterwear') },
              ].map((option) => {
                const selected = includeOuterwear === option.include;
                return (
                  <Pressable
                    key={String(option.include)}
                    accessibilityRole="tab"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    aria-selected={selected}
                    hitSlop={{ top: 3, right: 0, bottom: 3, left: 0 }}
                    onPress={() => setIncludeOuterwear(option.include)}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: radius.pill,
                      backgroundColor: selected ? 'rgba(255,255,255,0.9)' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...(selected ? shadow.soft : null),
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: weatherToggleWidth < 150 ? 10 : 11,
                        lineHeight: 15,
                        fontWeight: selected ? '600' : '400',
                        color: selected ? colors.label : colors.secondaryLabel,
                      }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View style={{ position: 'absolute', top: 22, left: 22, width: 138, zIndex: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Text
                style={{
                  color: colors.label,
                  fontSize: 64,
                  lineHeight: 70,
                  fontWeight: '300',
                  letterSpacing: -3,
                }}
              >
                {Math.round(weather.temperatureC)}
              </Text>
              <Text
                style={{
                  color: colors.label,
                  fontSize: 27,
                  lineHeight: 38,
                  fontWeight: '300',
                  marginTop: 2,
                }}
              >
                °
              </Text>
            </View>
            {weatherLocationLine ? (
              <Text style={{ ...type.headline, color: colors.label, marginTop: -4 }}>
                {weatherLocationLine}
              </Text>
            ) : null}
            <Text style={{ ...type.footnote, color: colors.secondaryLabel, marginTop: 10 }}>
              {t('today.weather.precipitation', { value: rainPercent ?? 0 })}
            </Text>
            <Text style={{ ...type.footnote, color: colors.secondaryLabel, marginTop: 5 }}>
              {t('today.weather.feelsLike', { value: Math.round(weather.feelsLikeC) })}
            </Text>
          </View>

          {onToggleFavorite ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(isFavorited ? 'today.v2.unfavorite' : 'today.v2.favorite')}
              onPress={onToggleFavorite}
              hitSlop={8}
              style={{
                position: 'absolute',
                top: 70,
                right: 18,
                zIndex: 4,
                width: 42,
                height: 42,
                borderRadius: radius.pill,
                backgroundColor: 'rgba(255,255,255,0.58)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.7)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SystemIcon
                name="heart"
                size={21}
                color={isFavorited ? colors.accent : colors.secondaryLabel}
                strokeWidth={1.8}
                fill={isFavorited ? colors.accent : 'none'}
              />
            </Pressable>
          ) : null}

          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 105,
              left: 12,
              right: 12,
              zIndex: 1,
              alignItems: 'center',
            }}
          >
            {/* The card is a fixed 540 tall, so the board scale must not grow
                with viewport width: cap the board at the 390-viewport width
                (366 → factor ≈ 1.14, the visually verified state) so shoes at
                y=306 stay inside the card on tablet/desktop web. width:'100%'
                keeps Yoga from collapsing the centered child to 0. */}
            <View style={{ width: '100%', maxWidth: 366 }}>
              <OutfitBoard pieces={displayedPieces} surface="transparent" />
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Stable fallback when no real weather context is available. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...type.title2, color: colors.label }}>
                {t('today.v2.outfitTitle')}
              </Text>
              {hint ? (
                <Text style={{ ...type.footnote, color: colors.tertiaryLabel }}>{hint}</Text>
              ) : null}
            </View>
            {onToggleFavorite ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(isFavorited ? 'today.v2.unfavorite' : 'today.v2.favorite')}
                onPress={onToggleFavorite}
                hitSlop={8}
                style={{ padding: 2 }}
              >
                <SystemIcon
                  name="heart"
                  size={22}
                  color={isFavorited ? colors.accent : colors.quaternaryLabel}
                  strokeWidth={1.8}
                  fill={isFavorited ? colors.accent : 'none'}
                />
              </Pressable>
            ) : null}
          </View>

          <OutfitBoard pieces={pieces} />

          <View style={{ height: 1, backgroundColor: colors.separatorSoft }} />

          <RecommendationReasonList reasons={reasons} />
        </>
      )}

      {weather && weatherRationale ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 6,
            minHeight: 24,
          }}
        >
          <SystemIcon name="sparkle" size={15} color={colors.accent} strokeWidth={1.8} />
          <Text numberOfLines={2} style={{ flex: 1, ...type.callout, color: colors.secondaryLabel }}>
            {weatherRationale}
          </Text>
        </View>
      ) : null}

      {/* Warm quote box — soft-accent surface, gold quotation mark. */}
      {!weather && quote ? (
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
            borderRadius: radius.md,
            backgroundColor: colors.accentSoft,
            paddingVertical: 12,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ ...type.title2, color: colors.agentGlow, lineHeight: 20 }}>&ldquo;</Text>
          <Text
            style={{ flex: 1, ...type.callout, color: colors.secondaryLabel, fontStyle: 'italic' }}
          >
            {quote}
          </Text>
        </View>
      ) : null}

      {/* Primary action — soft language, never "you must wear this". */}
      <Pressable
        accessibilityRole="button"
        onPress={onWear}
        style={{
          height: 54,
          borderRadius: radius.md,
          backgroundColor: colors.label,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ ...type.headline, color: colors.inverse }}>{t(wearLabelKey)}</Text>
      </Pressable>

      {/* Secondary text links: 查看详情 | 不喜欢 | 换一套 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        <Pressable accessibilityRole="button" onPress={onViewDetail} hitSlop={6}>
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
            {t('today.v2.viewDetail')}
          </Text>
        </Pressable>
        <Text style={{ ...type.callout, color: colors.separator, marginHorizontal: 12 }}>|</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowFeedback((v) => !v)}
          hitSlop={6}
        >
          <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
            {t('today.v2.dislike')}
          </Text>
        </Pressable>
        {showSwap ? (
          <>
            <Text style={{ ...type.callout, color: colors.separator, marginHorizontal: 12 }}>
              |
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={swapBusy || swapDisabled}
              onPress={onSwap}
              hitSlop={6}
            >
              {swapBusy ? (
                // House AI-presence orb, not a system spinner — one motion
                // language for every "AI is working" state (PR #105 review).
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AIOrb variant="thinking" size={24} />
                  <Text style={{ ...type.callout, color: colors.tertiaryLabel }}>
                    {t('today.v2.swapping')}
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    ...type.callout,
                    color: swapDisabled ? colors.quaternaryLabel : colors.tertiaryLabel,
                  }}
                >
                  {t('today.v2.swap')}
                </Text>
              )}
            </Pressable>
          </>
        ) : null}
      </View>

      {showFeedback ? (
        <View style={{ borderTopWidth: 1, borderTopColor: colors.separatorSoft, paddingTop: 14 }}>
          <RecommendationFeedback outfitId={outfit.id} temperatureC={temperatureC} />
        </View>
      ) : null}
    </View>
  );
}
