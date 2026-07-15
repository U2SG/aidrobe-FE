// Shared flat-lay piece resolver for the V2 single-outfit boards (Today v2 +
// First Outfit). Maps an outfit's items onto a neutral layout, preferring the
// full wardrobe item (image/name/category) and falling back to the brief.
import type { GarmentKind, GarmentPiece } from '@/components/outfit/garments';
import type { ItemCategory, OutfitSummary, WardrobeItem } from '@/types/api';

const V2_LAYOUT: Pick<GarmentPiece, 'x' | 'y' | 'scale' | 'rotate'>[] = [
  { x: 8, y: 14, scale: 1.12, rotate: '-7deg' },
  { x: 128, y: 128, scale: 1.24, rotate: '2deg' },
  { x: 8, y: 284, scale: 0.72, rotate: '7deg' },
  { x: 208, y: 292, scale: 0.78, rotate: '-5deg' },
  { x: 184, y: 18, scale: 0.86, rotate: '5deg' },
];

export function categoryToGarment(cat?: ItemCategory | string | null): GarmentKind {
  switch (cat) {
    case 'top':
      return 'shirt';
    case 'bottom':
      return 'trousers';
    case 'outerwear':
      return 'blazer';
    case 'dress':
      return 'dress';
    case 'shoes':
      return 'sneaker';
    case 'accessory':
      return 'bag';
    default:
      return 'shirt';
  }
}

export function resolveOutfitPieces(
  outfit: OutfitSummary,
  itemById: Map<string, WardrobeItem>,
): GarmentPiece[] {
  return outfit.items.map((brief, index) => {
    const item = itemById.get(brief.id);
    const layout = V2_LAYOUT[index] ?? V2_LAYOUT[index % V2_LAYOUT.length]!;
    return {
      ...layout,
      itemId: brief.id,
      kind: categoryToGarment(item?.category ?? brief.category),
      imageUrl: item?.imageUrl ?? brief.thumbUrl ?? null,
      name: item?.name ?? brief.name ?? null,
    };
  });
}
