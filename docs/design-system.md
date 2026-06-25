# Design System (FE#32)

Shared, token-driven UI primitives. **Import everything from the barrel:**

```ts
import { Button, Card, Badge, Input, Modal, BottomSheet, Typography, Skeleton, GradientSurface } from '@/components/ui';
```

All primitives are StyleSheet + design-token based (`src/theme/design.ts`) — **no
NativeWind `className`, no arbitrary Tailwind values** (`text-[10px]`, `rounded-[17px]`,
unmapped `bg-red-500`). New feature code should compose these instead of
re-hand-rolling cards / sheets / badges / text.

## Primitives

| Primitive | Use | Notes |
|---|---|---|
| `Button` | actions | pre-existing; 7 variants, `guardForeground` |
| `Typography` | all text | `variant` (largeTitle…caption) + `color` (token key or raw) — replaces inline `{ ...type.body, color }` |
| `Card` | elevated surfaces | `variant` (elevated/tinted/flat), `padding`, `radius`, `bordered`, optional `onPress` |
| `Badge` | plain pills | `tone` (neutral/accent/success/warning/danger/dark). Richer status → `StatusPill`; accent tag → `Tag` |
| `Input` | text fields | token-styled `TextInput` + `error`/`multiline` |
| `Modal` | centered dialog | scrim + card shell |
| `BottomSheet` | slide-up sheet | scrim + sheet shell (DepartureTimeSheet builds on it) |
| `Skeleton` | loading placeholder | animated pulse |
| `GradientSurface` | tinted hero surface | dependency-free highlight-edge (swap for expo-linear-gradient later, API stable) |

Re-exported (existing, not duplicated): `StatusPill`, `Tag`, `SystemIcon`,
`EmptyState`, `LoadingState`, `LoadingBlock`.

## Migration status

Done in this PR (token primitives, **value-preserving** unless noted):
- `DepartureTimeSheet` → `BottomSheet` + `Typography` (sheet shell is an exact extraction).
- `WardrobeShowcaseEmpty` → `Card` + `Typography` (Card defaults match the prior inline values).
- `OutfitCard`, `WardrobeItemCard` → `Card`/`Badge`/`Typography`/`Button`. **Normalized**:
  these were on the legacy NativeWind `brand-*`/`ink-*` palette; colors now resolve to
  the design tokens (near-identical, selection uses `accent`). **Not pixel-verified — needs a visual pass.**

Deferred (follow-up, not silently dropped):
- `AddItemScreen` `LinkImportModal` → `Modal` + `Input` (large screen; isolate separately).
- App-wide `Typography` adoption (hundreds of `Text` nodes) — migrate opportunistically per screen.
- Inline cards in `LandingPage` / `SettingsScreen` rows → `Card`.

## PR convention

New UI PRs: prefer primitives over hand-rolled `View`+shadow / `Modal` / inline `Text`;
no arbitrary Tailwind values. Extend a primitive rather than forking a one-off.
