import type { EncodeFunctionCallFuture } from "../../../types/module";
import type { EncodeFunctionCallExecutionState } from "../../execution/types/execution-state";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types";

import { reconcileArguments } from "../helpers/reconcile-arguments";
import { reconcileFunctionName } from "../helpers/reconcile-function-name";
import { reconcileStrategy } from "../helpers/reconcile-strategy";

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
