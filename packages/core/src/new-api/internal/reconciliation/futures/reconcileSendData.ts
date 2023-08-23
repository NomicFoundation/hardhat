import { SendDataFuture } from "../../../types/module";
import { resolveAddressLike } from "../../new-execution/future-processor/helpers/future-resolvers";
import { SendDataExecutionState } from "../../new-execution/types/execution-state";
import { compare } from "../helpers/compare";
import { reconcileFrom } from "../helpers/reconcile-from";
import { reconcileValue } from "../helpers/reconcile-value";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

export function reconcileSendData(
  future: SendDataFuture,
  executionState: SendDataExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  const resolvedAddress = resolveAddressLike(
    future.to,
    context.deploymentState,
    context.deploymentParameters
  );

  let result = compare(
    future,
    'Address "to"',
    executionState.to,
    resolvedAddress
  );
  if (result !== undefined) {
    return result;
  }

  result = reconcileValue(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileFrom(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
