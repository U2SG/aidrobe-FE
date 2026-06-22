import { useEffect, useRef } from 'react';
import { Animated, Image } from 'react-native';

import { GarmentSvg } from '@/components/ui/GarmentSvg';

import { GARMENT_IMAGES, type GarmentPiece } from './garments';

// A single animated garment tile on the outfit board. Extracted verbatim from
// TodayScreen's inline `AnimatedPiece` (FE#15) — same fade/rise/rotate/scale
// transform and the same 132*factor sizing, so the rendered output is unchanged.
export function OutfitPiece({
  piece,
  delay,
  factor,
  piecesKey,
}: {
  piece: GarmentPiece;
  delay: number;
  factor: number;
  piecesKey: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const image = piece.imageUrl ? { uri: piece.imageUrl } : GARMENT_IMAGES[piece.kind];
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
        <Image
          source={image}
          resizeMode="contain"
          style={{
            width: size,
            height: size,
            borderRadius: 30 * factor,
          }}
        />
      ) : (
        <GarmentSvg kind={piece.kind} size={112 * factor} />
      )}
    </Animated.View>
  );
}
