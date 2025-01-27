import { SendDataFuture } from "../../../types/module";
import { resolveSendToAddress } from "../../execution/future-processor/helpers/future-resolvers";
import { SendDataExecutionState } from "../../execution/types/execution-state";
import { compare } from "../helpers/compare";
import { reconcileData } from "../helpers/reconcile-data";
import { reconcileFrom } from "../helpers/reconcile-from";
import { reconcileStrategy } from "../helpers/reconcile-strategy";
import { reconcileValue } from "../helpers/reconcile-value";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

export function reconcileSendData(
  future: SendDataFuture,
  executionState: SendDataExecutionState,
  context: ReconciliationContext,
): ReconciliationFutureResult {
  const resolvedAddress = resolveSendToAddress(
    future.to,
    context.deploymentState,
    context.deploymentParameters,
    context.accounts,
  );

  let result = compare(
    future,
    'Address "to"',
    executionState.to,
    resolvedAddress,
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

  result = reconcileData(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileStrategy(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
