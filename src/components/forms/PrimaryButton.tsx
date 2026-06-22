import { Button } from '@/components/ui/Button';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

// Thin wrapper over the unified Button (primary variant). Kept for API
// compatibility with existing call sites.
export function PrimaryButton({ label, onPress, loading, disabled }: Props) {
  return <Button variant="primary" label={label} onPress={onPress} loading={loading} disabled={disabled} />;
}
