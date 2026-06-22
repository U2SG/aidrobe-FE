import { Button } from '@/components/ui/Button';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

// Thin wrapper over the unified Button (secondary variant). Kept for API
// compatibility with existing call sites.
export function SecondaryButton({ label, onPress, disabled }: Props) {
  return <Button variant="secondary" label={label} onPress={onPress} disabled={disabled} />;
}
