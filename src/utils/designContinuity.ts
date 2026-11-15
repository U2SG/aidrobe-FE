import type { DesignContextRef, DesignContextSnapshot } from '../types/api';

// Old servers may ignore an additive request field. Only a matching receipt
// proves that the saved result was made with these design conditions.
export function designContextMatches(expected: DesignContextRef, actual: DesignContextSnapshot | null | undefined): boolean {
  return actual?.conversationId.toLowerCase() === expected.conversationId.toLowerCase()
    && actual.revision === expected.expectedRevision;
}
