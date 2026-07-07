/**
 * Pure helper: which fields are visible on the import confirm screen
 * as a function of the late-night confirmation budget.
 *
 *   budget 2 (daytime)   → all fields visible
 *   budget 1 (20:00-22:00) → name + category visible; color + fit collapsed
 *   budget 0 (22:00+)    → name only visible; category + color + fit collapsed
 *
 * This helper is runtime-import-free so it can be loaded by Node directly
 * in scripts/importConfirmFields.test.ts (Node >= 22 type-stripping).
 */
export type ImportFieldsVisible = {
  name: boolean;
  category: boolean;
  color: boolean;
  fit: boolean;
};

export function visibleImportFields(budget: number): ImportFieldsVisible {
  return {
    name: true,
    category: budget >= 1,
    color: budget === 2,
    fit: budget === 2,
  };
}
