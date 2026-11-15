import type { StylingExperiences } from '../api/stylingExperiences';

// A plan, a visual reaction, and an intention are not evidence of wearing it.
export function experienceState(data: StylingExperiences) {
  return {
    appreciated: data.items.find((item) => item.kind === 'appreciated'),
    wantToTry: data.items.find((item) => item.kind === 'want_to_try'),
    wornDate: data.latest_worn_date,
    wearFeedback: data.latest_worn_date
      ? data.items.find((item) => item.kind === 'wear_feedback' && item.worn_date === data.latest_worn_date)
      : undefined,
  };
}
