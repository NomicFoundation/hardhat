import type { SendDataFuture } from "../../../types/module.js";
import type { SendDataExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types.js";

import { resolveSendToAddress } from "../../execution/future-processor/helpers/future-resolvers.js";
import { compare } from "../helpers/compare.js";
import { reconcileData } from "../helpers/reconcile-data.js";
import { reconcileFrom } from "../helpers/reconcile-from.js";
import { reconcileStrategy } from "../helpers/reconcile-strategy.js";
import { reconcileValue } from "../helpers/reconcile-value.js";

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
