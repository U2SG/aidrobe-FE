import { createElement, useEffect, useRef, useState } from 'react';
import { Animated, Image as RNImage } from 'react-native';

import { GarmentSvg } from '@/components/ui/GarmentSvg';

import { GARMENT_IMAGES, type GarmentPiece } from './garments';
import { matteLooksDestructive, removeBorderConnectedMatte, scaledMatteSize } from './outfitMatte';

function weatherMaskFor(kind: GarmentPiece['kind']) {
  const ellipse = kind === 'sneaker' ? '74% 56%' : kind === 'trousers' ? '56% 70%' : '60% 62%';
  return `radial-gradient(ellipse ${ellipse} at 50% 50%, #000 0%, #000 84%, rgba(0,0,0,0.88) 92%, transparent 100%)`;
}

const weatherCutoutCache = new Map<string, Promise<string | null>>();
const MAX_CACHED_CUTOUTS = 24;

function prepareWeatherCutout(uri: string, maxDimension: number) {
  const cacheKey = `${uri}@${maxDimension}`;
  const cached = weatherCutoutCache.get(cacheKey);
  if (cached) return cached;

  const prepared = new Promise<string | null>((resolve) => {
    const source = new window.Image();
    source.crossOrigin = 'anonymous';
    source.onload = () => {
      try {
        const { width, height } = scaledMatteSize(source.naturalWidth, source.naturalHeight, maxDimension);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(source, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);
        removeBorderConnectedMatte(frame.data, width, height);
        if (matteLooksDestructive(frame.data, width, height)) {
          // The fill ate into the garment (white/light fabric) — fall back to
          // the soft-mask render rather than showing ragged holes.
          resolve(null);
          return;
        }

        context.putImageData(frame, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    source.onerror = () => resolve(null);
    source.src = uri;
  });
  const reusable = prepared.then((result) => {
    if (!result) weatherCutoutCache.delete(cacheKey);
    return result;
  });
  weatherCutoutCache.set(cacheKey, reusable);
  if (weatherCutoutCache.size > MAX_CACHED_CUTOUTS) {
    const oldest = weatherCutoutCache.keys().next().value;
    if (oldest) weatherCutoutCache.delete(oldest);
  }
  return reusable;
}

function useWeatherCutout(uri: string | null | undefined, enabled: boolean, maxDimension: number) {
  const [cutoutUri, setCutoutUri] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setCutoutUri(null);
    if (!enabled || !uri) return () => undefined;
    void prepareWeatherCutout(uri, maxDimension).then((result) => {
      if (active) setCutoutUri(result);
    });
    return () => {
      active = false;
    };
  }, [enabled, uri, maxDimension]);

  return cutoutUri;
}

export function OutfitPiece({
  piece,
  delay,
  factor,
  piecesKey,
  weatherBlend = false,
}: {
  piece: GarmentPiece;
  delay: number;
  factor: number;
  piecesKey: string;
  weatherBlend?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const image = piece.imageUrl ? { uri: piece.imageUrl } : GARMENT_IMAGES[piece.kind];
  // piece.scale folded into the box size (position inset-compensated) instead
  // of a transform: scaling the rasterized 132*factor box up is what blurred
  // the weather silhouette (#110). Matte at display resolution, capped.
  const baseSize = (image ? 132 : 112) * factor;
  const size = baseSize * piece.scale;
  const inset = (baseSize * (1 - piece.scale)) / 2;
  const mattePx = Math.min(768, Math.ceil(size * (window.devicePixelRatio || 1)));
  const cutoutUri = useWeatherCutout(piece.imageUrl, weatherBlend, mattePx);
  const weatherMask = weatherMaskFor(piece.kind);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 520, delay, useNativeDriver: false }).start();
  }, [anim, delay, piecesKey]);

  // Overlay visibility (outerwear toggle): fade instead of unmounting so the
  // rest of the board never re-mounts (no entry replay, no cutout refetch).
  const visibility = useRef(new Animated.Value(piece.hidden ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(visibility, {
      toValue: piece.hidden ? 0 : 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [visibility, piece.hidden]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x * factor + inset,
        top: piece.y * factor + inset,
        opacity: Animated.multiply(anim, visibility),
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { rotate: piece.rotate ?? '0deg' },
        ],
      }}
    >
      {weatherBlend && piece.imageUrl ? (
        createElement('img', {
          src: cutoutUri ?? piece.imageUrl,
          alt: '',
          draggable: false,
          style: {
            display: 'block',
            width: size,
            height: size,
            objectFit: 'contain',
            borderRadius: 30 * factor * piece.scale,
            WebkitMaskImage: cutoutUri ? undefined : weatherMask,
            maskImage: cutoutUri ? undefined : weatherMask,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          },
        })
      ) : image ? (
        <RNImage
          source={image}
          resizeMode="contain"
          style={{ width: size, height: size, borderRadius: 30 * factor * piece.scale }}
        />
      ) : (
        <GarmentSvg kind={piece.kind} size={size} />
      )}
    </Animated.View>
  );
}
