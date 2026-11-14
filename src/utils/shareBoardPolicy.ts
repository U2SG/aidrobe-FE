// A server board renders the outfit as stored. Once the user has swapped a
// piece locally (replacements are not persisted), that picture would show the
// old garments next to a text listing the new ones, so share text only.
export function canShareServerBoard(params: { isLocal: boolean; localReplacementCount: number }): boolean {
  return !params.isLocal && params.localReplacementCount === 0;
}
