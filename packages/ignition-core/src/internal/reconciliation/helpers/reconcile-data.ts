import type { SendDataFuture } from "../../../types/module.js";
import type { SendDataExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types.js";

import { assertIgnitionInvariant } from "../../utils/assertions.js";
import { findResultForFutureById } from "../../views/find-result-for-future-by-id.js";

import { compare } from "./compare.js";

export function reconcileData(
  future: SendDataFuture,
  exState: SendDataExecutionState,
  context: ReconciliationContext,
): ReconciliationFutureResultFailure | undefined {
  if (typeof future.data === "string" || future.data === undefined) {
    return compare(future, "Data", exState.data, future.data ?? "0x");
  }

  const newData = findResultForFutureById(
    context.deploymentState,
    future.data.id,
  );

  assertIgnitionInvariant(
    typeof newData === "string",
    "Expected data to be a string",
  );

  return compare(future, "Data", exState.data, newData);
}
