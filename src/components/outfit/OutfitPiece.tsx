import { useEffect, useRef, useState } from 'react';
import { Animated, Image, type ImageSourcePropType } from 'react-native';
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

// A single animated garment tile on the outfit board. Extracted verbatim from
// TodayScreen's inline `AnimatedPiece` (FE#15) — same fade/rise/rotate/scale
// transform and the same 132*factor sizing, so the rendered output is unchanged.
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
  const size = 132 * factor;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 520, delay, useNativeDriver: false }).start();
  }, [anim, delay, piecesKey]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: piece.x * factor,
        top: piece.y * factor,
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
          { rotate: piece.rotate ?? '0deg' },
          { scale: piece.scale },
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
              borderRadius: 30 * factor,
            }}
          />
        )
      ) : (
        <GarmentSvg kind={piece.kind} size={112 * factor} />
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

  useEffect(() => {
    setCutout(null);
    if (!image) return undefined;

    // Pixel readback is synchronous, so do it after commit rather than during
    // React render. This also guarantees cleanup for replaced images.
    const prepared = createNativeWeatherCutout(image);
    setCutout(prepared);
    return () => prepared?.dispose();
  }, [image]);

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

function createNativeWeatherCutout(image: SkImage) {
  const { width, height } = scaledMatteSize(image.width(), image.height());
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
