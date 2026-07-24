import { useEffect, useRef, useState } from 'react';
import { Animated, Image, PixelRatio, type ImageSourcePropType } from 'react-native';
import {
  AlphaType,
  Canvas,
  ColorType,
  Image as SkiaImage,
  Mask,
  RadialGradient,
  Rect,
  Skia,
  type SkImage,
  useImage,
  vec,
} from '@shopify/react-native-skia';

import { GarmentSvg } from '@/components/ui/GarmentSvg';

import { GARMENT_IMAGES, type GarmentPiece } from './garments';
import { removeBorderConnectedMatte, scaledMatteSize } from './outfitMatte';

// A single animated garment tile on the outfit board. Same fade/rise/rotate
// motion as TodayScreen's inline `AnimatedPiece` (FE#15), but piece.scale is
// folded into the rendered box size instead of a GPU transform — a transform
// upscales the already-rasterized texture (132*factor px), which is what made
// the weather silhouette (scales up to 1.65) blurry (#110). The box position
// is inset-compensated so the visual center matches the old scale-about-center
// transform for every consumer.
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
  const skiaSource: Parameters<typeof useImage>[0] =
    piece.imageUrl ?? (image ? Image.resolveAssetSource(image)?.uri : null);
  const baseSize = (image ? 132 : 112) * factor;
  const size = baseSize * piece.scale;
  const inset = (baseSize * (1 - piece.scale)) / 2;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 520, delay, useNativeDriver: false }).start();
  }, [anim, delay, piecesKey]);

  // Overlay visibility (outerwear toggle): fade instead of unmounting so the
  // rest of the board never re-mounts (no entry replay, no matte recompute).
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
      {image ? (
        weatherBlend && skiaSource ? (
          <WeatherMaskedGarment source={skiaSource} fallbackSource={image} size={size} />
        ) : (
          <Image
            source={image}
            resizeMode="contain"
            style={{
              width: size,
              height: size,
              borderRadius: 30 * factor * piece.scale,
            }}
          />
        )
      ) : (
        <GarmentSvg kind={piece.kind} size={size} />
      )}
    </Animated.View>
  );
}

function WeatherMaskedGarment({
  source,
  fallbackSource,
  size,
}: {
  source: Parameters<typeof useImage>[0];
  fallbackSource: ImageSourcePropType;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  const image = useImage(source, () => setFailed(true));
  const [cutout, setCutout] = useState<SkImage | null>(null);

  // Matte at the resolution this piece actually displays (physical pixels),
  // capped to bound the synchronous flood-fill cost. The old fixed 320px cap
  // was the other half of the blur (#110).
  const mattePx = Math.min(768, Math.ceil(size * PixelRatio.get()));

  useEffect(() => {
    setCutout(null);
    if (!image) return undefined;

    // Pixel readback is synchronous, so do it after commit rather than during
    // React render. This also guarantees cleanup for replaced images.
    const prepared = createNativeWeatherCutout(image, mattePx);
    setCutout(prepared);
    return () => prepared?.dispose();
  }, [image, mattePx]);

  if (!image) {
    return failed ? (
      <Image source={fallbackSource} resizeMode="contain" style={{ width: size, height: size }} />
    ) : null;
  }

  return (
    <Canvas style={{ width: size, height: size }}>
      {cutout ? (
        <SkiaImage image={cutout} x={0} y={0} width={size} height={size} fit="contain" />
      ) : (
        <Mask
          mode="alpha"
          mask={
            <Rect x={0} y={0} width={size} height={size}>
              <RadialGradient
                c={vec(size * 0.5, size * 0.5)}
                r={size * 0.68}
                colors={[
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,1)',
                  'rgba(255,255,255,0.76)',
                  'rgba(255,255,255,0)',
                ]}
                positions={[0, 0.76, 0.9, 1]}
              />
            </Rect>
          }
        >
          <SkiaImage image={image} x={0} y={0} width={size} height={size} fit="contain" />
        </Mask>
      )}
    </Canvas>
  );
}

function createNativeWeatherCutout(image: SkImage, maxDimension: number) {
  const { width, height } = scaledMatteSize(image.width(), image.height(), maxDimension);
  const surface = Skia.Surface.MakeOffscreen(width, height);
  if (!surface) return null;

  const paint = Skia.Paint();
  let snapshot: SkImage | null = null;
  let readable: SkImage | null = null;
  try {
    surface
      .getCanvas()
      .drawImageRect(
        image,
        Skia.XYWHRect(0, 0, image.width(), image.height()),
        Skia.XYWHRect(0, 0, width, height),
        paint,
      );
    surface.flush();
    snapshot = surface.makeImageSnapshot();
    readable = snapshot.makeNonTextureImage() ?? snapshot;
    const info = {
      width,
      height,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };
    const sourcePixels = readable.readPixels(0, 0, info);
    if (!(sourcePixels instanceof Uint8Array)) return null;

    const pixels = new Uint8Array(sourcePixels);
    removeBorderConnectedMatte(pixels, width, height);
    const data = Skia.Data.fromBytes(pixels);
    const cutout = Skia.Image.MakeImage(info, data, width * 4);
    data.dispose();
    return cutout;
  } catch {
    return null;
  } finally {
    if (readable && readable !== snapshot) readable.dispose();
    snapshot?.dispose();
    paint.dispose();
    surface.dispose();
  }
}
