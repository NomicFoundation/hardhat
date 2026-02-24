import type { EncodeFunctionCallFuture } from "../../../types/module.js";
import type { EncodeFunctionCallExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types.js";

import { reconcileArguments } from "../helpers/reconcile-arguments.js";
import { reconcileFunctionName } from "../helpers/reconcile-function-name.js";
import { reconcileStrategy } from "../helpers/reconcile-strategy.js";

export function reconcileNamedEncodeFunctionCall(
  future: EncodeFunctionCallFuture<string, string>,
  executionState: EncodeFunctionCallExecutionState,
  context: ReconciliationContext,
): ReconciliationFutureResult {
  let result = reconcileFunctionName(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileArguments(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileStrategy(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
