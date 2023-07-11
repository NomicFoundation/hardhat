import sortBy from "lodash/sortBy";

import { Future } from "../../types/module";
import { ExecutionEngineState } from "../types/execution-engine";
import { assertIgnitionInvariant } from "../utils/assertions";

/**
 * Sort futures based on exeuction state, particularly the from/nonce
 * against the current on chain action. Accounts are sorted alphabetically,
 * nonces are sorted in increasing order with undefined
 * coming last (ties broken by future id).
 *
 * @param futures - the futures of the batch
 * @param state - the execution engine state
 * @returns sorted futures
 */
export function sortFuturesByNonces(
  futures: Future[],
  state: ExecutionEngineState
): Future[] {
  const details = futures.map((f) => {
    const exState = state.executionStateMap[f.id];

    assertIgnitionInvariant(
      exState !== undefined,
      `Execution state needed for sorting for ${f.id}`
    );

    return {
      future: f,
      from: exState.onchain.from,
      nonce: exState.onchain.nonce,
    };
  });

  const sortedDetails = sortBy(details, ["from", "nonce", "future.id"]);

  return sortedDetails.map((sd) => sd.future);
}
