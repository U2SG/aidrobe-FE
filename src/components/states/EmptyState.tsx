// Canonical empty-state surface. The real implementation already lives in
// `components/feedback/EmptyState` (added by FE#17); this module is the
// motion-system entrypoint and re-exports it so there is exactly ONE
// EmptyState body in the tree — no duplication.
export { EmptyState } from '@/components/feedback/EmptyState';
