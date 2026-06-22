// Canonical error-state surface. The real implementation already lives in
// `components/feedback/ErrorState` (added by FE#17); re-exported here so the
// motion-system `states/` namespace stays the single import point without
// creating a second ErrorState body.
export { ErrorState } from '@/components/feedback/ErrorState';
