import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native';

import { colors, radius, type } from '@/theme/design';

import {
  imageThumbLoaderHandlers,
  initialImageThumbState,
  type ImageThumbState,
} from './imageThumbState';
import { Skeleton } from './Skeleton';
import { SystemIcon } from './SystemIcon';

// FE#52 — unified image thumbnail primitive. This is the ONE place that handles
// the four image states, so business screens (Ask item refs, ShouldBuy similar
// items, Insights 最常穿, wardrobe cards) stop hand-writing bespoke empty
// <View> placeholders / inline <Image> blocks:
//
//   loading → skeleton (never a blank colored block)
//   empty   → category/icon placeholder with a readable, already-localized label
//   failed  → fallback icon, optional retry / debug marker
//   loaded  → cover image with consistent radius + crop
//
// Do NOT re-introduce per-screen placeholder visuals once consumers migrate.

export { type ImageThumbState } from './imageThumbState';

export interface ImageThumbProps {
  // Signed/source URL. null/undefined ⇒ empty state (no fetch attempted).
  uri?: string | null;
  // Optional bundled/local source. Used by showcase/demo items; ignored when uri is set.
  source?: ImageSourcePropType | null;
  // Square edge length in px. Default 60.
  size?: number;
  // Corner radius. Default radius.sm.
  cornerRadius?: number;
  // Already-localized label shown under/inside the empty & failed placeholders
  // (e.g. resolved item name or category·color). Never a raw enum value.
  fallbackLabel?: string;
  // Optional leading glyph for the empty/failed placeholder.
  icon?: ReactNode;
  // Defaults to fallbackLabel.
  accessibilityLabel?: string;
  // When provided, the failed state renders a tappable retry affordance.
  onRetry?: () => void;
  // 'cover' (default) crops to fill; 'contain' keeps the full subject visible —
  // use for garment cutouts where cropping loses the silhouette.
  resizeMode?: 'cover' | 'contain';
}

export function ImageThumb({
  uri,
  source,
  size = 60,
  cornerRadius = radius.sm,
  fallbackLabel,
  icon,
  accessibilityLabel,
  onRetry,
  resizeMode = 'cover',
}: ImageThumbProps) {
  const hasImage = Boolean(uri || source);
  const [state, setState] = useState<ImageThumbState>(initialImageThumbState(hasImage));
  // Stable for this component's whole life — see imageThumbLoaderHandlers.
  // Passing inline arrows here re-arms react-native-web's loader effect on every
  // render and reloads the image forever (FE#143); scripts/image-thumb.test.ts
  // fails if these ever go back to being per-render closures.
  const loader = useMemo(() => imageThumbLoaderHandlers(setState), []);

  // `source` is compared by identity, so it must be a stable reference: a
  // module-level asset (every current consumer that passes it) or a memoized
  // object. An inline `source={{ uri }}` would re-run this effect every render
  // and reset the state machine — the same identity-loop class the loader
  // callbacks above just fixed, one layer up. Pass `uri` instead; that is a
  // string and compares by value.
  useEffect(() => {
    setState(initialImageThumbState(Boolean(uri || source)));
  }, [source, uri]);

  const label = fallbackLabel?.trim() || '';
  const placeholderIcon = icon ?? (
    <SystemIcon
      name={state === 'failed' ? 'exclamation' : 'photo'}
      size={Math.max(18, Math.round(size * 0.32))}
      color={colors.tertiaryLabel}
    />
  );

  const placeholder = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: cornerRadius,
        backgroundColor: colors.secondaryElevated,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: 6,
        gap: 4,
      }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={`image-thumb-${state}`}
    >
      {placeholderIcon}
      {label ? (
        <Text
          style={{ ...type.caption, color: colors.tertiaryLabel, textAlign: 'center' }}
          numberOfLines={2}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );

  const imageSource = uri ? { uri } : source;

  if (!imageSource || state === 'empty') return placeholder;

  if (state === 'failed') {
    if (!onRetry) return placeholder;
    return (
      <Pressable
        onPress={() => {
          setState(initialImageThumbState(Boolean(uri || source)));
          onRetry();
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {placeholder}
      </Pressable>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: cornerRadius,
        overflow: 'hidden',
        backgroundColor: colors.secondaryElevated,
      }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID="image-thumb-loaded-frame"
    >
      {state === 'loading' ? (
        <Skeleton
          width={size}
          height={size}
          radius={cornerRadius}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      ) : null}
      <Image
        source={imageSource}
        style={{ width: '100%', height: '100%', opacity: state === 'loaded' ? 1 : 0 }}
        resizeMode={resizeMode}
        onLoadStart={loader.onLoadStart}
        onLoad={loader.onLoad}
        onError={loader.onError}
        testID="image-thumb-image"
      />
    </View>
  );
}
