import type { ImageSourcePropType } from 'react-native';

import bagCreamTote from '@/assets/wardrobe/bag-cream-tote.png';
import bottomIndigoJeans from '@/assets/wardrobe/bottom-indigo-jeans.png';
import bottomIvoryTrousers from '@/assets/wardrobe/bottom-ivory-trousers.png';
import shoesWhiteCanvas from '@/assets/wardrobe/shoes-white-canvas.png';
import topCreamShirt from '@/assets/wardrobe/top-cream-shirt.png';
import topOatKnit from '@/assets/wardrobe/top-oat-knit.png';

// Shared garment vocabulary for the Today outfit board + its candidate tiles.
// Extracted from TodayScreen (FE#15) so OutfitBoard / OutfitPiece and the screen
// all reference one source of truth instead of importing across the layer.

export type GarmentKind =
  | 'shirt'
  | 'blazer'
  | 'trousers'
  | 'sweater'
  | 'jeans'
  | 'dress'
  | 'skirt'
  | 'tee'
  | 'loafer'
  | 'sneaker'
  | 'bag';

export type GarmentPiece = {
  kind: GarmentKind;
  x: number;
  y: number;
  scale: number;
  rotate?: string;
  itemId?: string;
  imageUrl?: string | null;
  name?: string | null;
};

export const GARMENT_IMAGES: Partial<Record<GarmentKind, ImageSourcePropType>> = {
  shirt: topCreamShirt as ImageSourcePropType,
  trousers: bottomIvoryTrousers as ImageSourcePropType,
  sweater: topOatKnit as ImageSourcePropType,
  jeans: bottomIndigoJeans as ImageSourcePropType,
  sneaker: shoesWhiteCanvas as ImageSourcePropType,
  bag: bagCreamTote as ImageSourcePropType,
};

export const CANVAS_W = 320;
export const CANVAS_H = 420;
