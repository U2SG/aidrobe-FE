// FE#72 — RN-free pure mapping for the recommendation feedback chips. Turns a
// tapped chip into the {feedback_type, reason_tags} the BE feedback endpoint
// expects. Import-free so the Node regression runner can load it (the .tsx
// component pulls in react-native at module scope).

export type FeedbackKind = 'love' | 'like' | 'neutral' | 'dislike';

/** The chip the user tapped: the positive sentinel `'love'`, or a stable
 *  reason-tag key (e.g. 'too_formal'). */
export type FeedbackChip = string;

export interface ChipFeedback {
  /** feedback_type on the wire (love / dislike). */
  kind: FeedbackKind;
  /** stable enum reason keys — never localized labels. */
  reasonTags: string[];
}

/** 'love' → a positive rating with no reason; any reason chip → a dislike whose
 *  single reason tag is the stable enum key (e.g. 'too_formal'). */
export function reasonChipToFeedback(chip: FeedbackChip): ChipFeedback {
  return chip === 'love'
    ? { kind: 'love', reasonTags: [] }
    : { kind: 'dislike', reasonTags: [chip] };
}
