import { useState } from 'react';
import { View } from 'react-native';

import { CANVAS_H, CANVAS_W, type GarmentPiece } from './garments';
import { OutfitPiece } from './OutfitPiece';

// Wash tint behind the floating pieces. Matches TodayScreen's local P.wash so
// the extracted board renders identically to the previous inline OutfitCanvas.
const BOARD_WASH = '#EEF3F1';

// The outfit board: a responsive canvas that lays out garment pieces over a
// soft wash panel. Extracted verbatim from TodayScreen's inline `OutfitCanvas`
// (FE#15) — same onLayout `factor` math, `piecesKey`, and staggered 70ms delays.
export function OutfitBoard({ pieces }: { pieces: GarmentPiece[] }) {
  const [width, setWidth] = useState(0);
  const factor = Math.min(1.18, Math.max(0.82, width / CANVAS_W));
  const piecesKey = pieces.map((piece) => `${piece.itemId ?? piece.kind}:${piece.imageUrl ?? ''}`).join('-');

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{
        flex: 1,
        minHeight: CANVAS_H * factor,
        position: 'relative',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 20,
          right: 14,
          top: 26,
          bottom: 28,
          borderRadius: 42,
          backgroundColor: BOARD_WASH,
          opacity: 0.72,
        }}
      />
      {width > 0
        ? pieces.map((piece, index) => (
            <OutfitPiece
              key={`${piece.itemId ?? piece.kind}-${index}`}
              piece={piece}
              delay={index * 70}
              factor={factor}
              piecesKey={piecesKey}
            />
          ))
        : null}
    </View>
  );
}
