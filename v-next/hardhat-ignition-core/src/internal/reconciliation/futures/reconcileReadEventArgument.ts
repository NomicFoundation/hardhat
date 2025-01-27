import { ReadEventArgumentFuture } from "../../../types/module";
import { resolveAddressForContractFuture } from "../../execution/future-processor/helpers/future-resolvers";
import { ReadEventArgumentExecutionState } from "../../execution/types/execution-state";
import { compare } from "../helpers/compare";
import { reconcileStrategy } from "../helpers/reconcile-strategy";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

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
