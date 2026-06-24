# Outfit Visual Rendering Contract (FE/BE)

> Shared schema for rendering an outfit as a composed visual board across Today,
> Ask, saved outfits, and share/poster surfaces. **Contract-first**: this doc is
> the agreement; FE renderer and BE response implement against it. Status: draft
> for sign-off (FE#33). No code consumes the new fields yet — FE keeps its
> client-side fallback layout until BE populates `visual`.

## Why

Today the FE positions garments with **hardcoded client-side layouts**, with no
layout metadata from the API:

- `src/screens/today/TodayScreen.tsx` — per-strategy `PRESETS` (`safe`/`fast`/`stylish`), absolute px on a 320×420 canvas, indexed by item order; `EXTRA_PIECE_LAYOUT` for >4 items.
- `src/screens/today/OutfitDetailScreen.tsx` — `HERO_LAYOUT`, 5 fixed positions by item index.
- `src/components/outfit/OutfitBoard.tsx` / `OutfitPiece.tsx` — render `GarmentPiece { kind, x, y, scale, rotate?, itemId?, imageUrl?, name? }` (px coords, `rotate` is a CSS string like `'-7deg'`, z-order = array index).

Consequences: each surface re-invents layout, Today/Ask/Share drift apart, and BE
can't return layout-aware or shareable outfit assets. This contract gives one
renderer-friendly shape.

## Contract

A renderable outfit MAY carry a `visual` block. Fields are **normalized and
device-independent** so one renderer scales to any canvas:

```jsonc
{
  "outfit": {
    "id": "uuid",
    "visual": {
      "layout_version": "v1",        // cache-bust / renderer-compat tag (cf. outfit_board)
      "aspect_ratio": 0.7619,         // board w/h (e.g. 320/420); renderer maps to its canvas
      "pieces": [
        {
          "item_id": "uuid",
          "image_url": "https://… (signed, 30-min TTL when internal)",
          "x": 0.25,                  // normalized board coordinate, 0..1 (piece CENTER)
          "y": 0.40,                  // normalized board coordinate, 0..1 (piece CENTER)
          "scale": 1.0,               // relative scale (1.0 = renderer base piece size)
          "rotation": -7,             // DEGREES (number), clockwise; NOT a CSS string
          "layer": 1                  // explicit z-index; higher renders on top
        }
      ]
    }
  }
}
```

### Field rules

| Field | Type | Rule |
|---|---|---|
| `layout_version` | string | Bump to force re-render / signal a renderer-incompatible layout change. |
| `aspect_ratio` | number | Board width / height. Renderer scales normalized coords to its own canvas. |
| `pieces[].item_id` | uuid | Wardrobe item; lets FE resolve the full item if `image_url` is stale. |
| `pieces[].image_url` | string \| null | Preferred cutout; null → FE falls back (see below). |
| `pieces[].x` / `y` | number 0..1 | Normalized **center** position. Renderer: `left = x*W - pieceW/2`. |
| `pieces[].scale` | number | Relative to the renderer's base piece size. Clamp to a sane range (e.g. 0.3–2.0). |
| `pieces[].rotation` | number | Degrees, clockwise. FE converts to `'<n>deg'`. |
| `pieces[].layer` | int | Render order; ties broken by array order. |

### Coordinate decision

- **Normalized 0..1, not absolute px.** The current presets are px on 320×420;
  those convert via `x_norm = x_px / 320`, `y_norm = y_px / 420`. Normalized keeps
  the contract canvas-agnostic (phone, board export, web).
- **`rotation` is a number in degrees**, not the current CSS string (`'-7deg'`),
  so it's platform-neutral; the RN renderer formats it.
- **`x`/`y` address the piece center** (current presets treat them as top-left;
  the renderer already knows piece size, so center is unambiguous across scales).

## Fallback behavior

`visual` is **optional**. The renderer degrades gracefully:

1. **No `visual` / empty `pieces`** → keep today's client-side layout (`PRESETS` by
   strategy, `HERO_LAYOUT` for detail). Nothing breaks before BE ships layouts.
2. **`image_url` null** → resolve the item and use `cover_image_url ?? original_image_url`;
   if still null → render the `GarmentSvg` silhouette for the item's category.
3. **Partial pieces** (some items lack layout) → lay the remainder out with the
   existing extra-piece fallback so no item is dropped.

## Used by

Today page · Ask Aidrobe outfit previews · Saved outfits · Share poster/board ·
Outfit preview components. A single `<OutfitBoard pieces={…} />` consumes the
normalized pieces on every surface.

## Relationship to existing work

- **Share board (API_GAP[FE#15], see `docs/api-gaps.md`)**: a server-rendered
  shareable board needs exactly this layout to compose pieces — this contract is
  the prerequisite. The render endpoint is out of scope here (separate issue).
- **`OutfitVisualAsset` / outfit board worker (BE)**: the async board renderer can
  consume `visual.pieces` to rasterize; `layout_version` aligns with its existing
  versioning.
- **`backend-gaps.md` §4**: previously "hero visual is client-side, no BE action" —
  this contract supersedes that once BE returns `visual`.

## Open questions for sign-off

1. Does BE generate layouts at recommendation time (stored per outfit) or on
   demand for share only? (Affects where `visual` is populated.)
2. Is `aspect_ratio` fixed per product (single board shape) or per outfit?
3. Clamp ranges for `scale` and the base piece size definition.

## Non-goals

- Implementing the FE renderer changes or the BE response in this PR (doc-only).
- The share/export render endpoint itself.
