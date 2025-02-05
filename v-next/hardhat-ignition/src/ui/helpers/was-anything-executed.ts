import type { UiState } from "../types.js";

/**
 * Was anything executed during the deployment. We determine this based
 * on whether the batcher indicates that there was at least one batch.
 */
export function wasAnythingExecuted({
  batches,
}: Pick<UiState, "batches">): boolean {
  return batches.length > 0;
}
