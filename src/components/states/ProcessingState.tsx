// Processing-state surface — the heavy "AI is working" wait (recognition,
// generation). Delegates entirely to the existing `feedback/ProcessingOverlay`
// (which now renders the AIOrb), so there is no duplicate overlay; this is the
// motion-system entrypoint for that look.
import { ProcessingOverlay } from '@/components/feedback/ProcessingOverlay';

interface Props {
  title: string;
  detail?: string;
  variant?: 'orb' | 'spinner';
}

export function ProcessingState({ title, detail, variant }: Props) {
  return <ProcessingOverlay title={title} detail={detail} variant={variant} />;
}
