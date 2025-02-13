import type { ReadEventArgumentFuture } from "../../../types/module.js";
import type { ReadEventArgumentExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types.js";

import { resolveAddressForContractFuture } from "../../execution/future-processor/helpers/future-resolvers.js";
import { compare } from "../helpers/compare.js";
import { reconcileStrategy } from "../helpers/reconcile-strategy.js";

export function reconcileReadEventArgument(
  future: ReadEventArgumentFuture,
  executionState: ReadEventArgumentExecutionState,
  context: ReconciliationContext,
): ReconciliationFutureResult {
  const resolvedAddress = resolveAddressForContractFuture(
    future.emitter,
    context.deploymentState,
  );

  let result = compare(
    future,
    "Emitter",
    executionState.emitterAddress,
    resolvedAddress,
    ` (future ${future.emitter.id})`,
  );
  if (result !== undefined) {
    return result;
  }

  result = compare(
    future,
    "Event name",
    executionState.eventName,
    future.eventName,
  );
  if (result !== undefined) {
    return result;
  }

  result = compare(
    future,
    "Event index",
    executionState.eventIndex,
    future.eventIndex,
  );
  if (result !== undefined) {
    return result;
  }

  result = compare(
    future,
    "Argument name or index",
    executionState.nameOrIndex,
    future.nameOrIndex,
  );
  if (result !== undefined) {
    return result;
  }

  result = reconcileStrategy(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
