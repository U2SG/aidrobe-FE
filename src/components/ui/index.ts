// Design-system barrel (FE#32). One import surface for the shared primitives.
// New primitives live here; existing components are re-exported so callers get
// the whole system from `@/components/ui` without us duplicating them.

// New primitives
export { Badge, type BadgeTone } from './Badge';
export { BottomSheet } from './BottomSheet';
export { BulkActionBar, type BulkAction } from './BulkActionBar';
export { Card, type CardVariant } from './Card';
export { ConfidenceBadge, confidenceTone, isLowConfidence } from './ConfidenceBadge';
export { EditableChip } from './EditableChip';
export { GradientSurface } from './GradientSurface';
export { ImageThumb, type ImageThumbProps, type ImageThumbState } from './ImageThumb';
export { Input } from './Input';
export { Modal } from './Modal';
export { OptionPickerSheet, type PickerOption } from './OptionPickerSheet';
export { Skeleton } from './Skeleton';
export { Typography, type TypographyVariant } from './Typography';

// Existing primitives (re-exported, not duplicated)
export { Button, type ButtonSize, type ButtonVariant } from './Button';
export { StatusPill } from './StatusPill';
export { SystemIcon } from './SystemIcon';
export { Tag } from './Tag';

// Existing state surfaces (re-exported from their current homes)
export { EmptyState } from '../feedback/EmptyState';
export { ErrorState } from '../feedback/ErrorState';
export { InlineRetry } from '../feedback/InlineRetry';
export { LoadingBlock } from '../feedback/LoadingBlock';
export { LoadingState } from '../states/LoadingState';
