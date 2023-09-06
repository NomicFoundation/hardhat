import { NamedStaticCallFuture } from "../../../types/module";
import { StaticCallExecutionState } from "../../execution/types/execution-state";
import { reconcileArguments } from "../helpers/reconcile-arguments";
import { reconcileContract } from "../helpers/reconcile-contract";
import { reconcileFrom } from "../helpers/reconcile-from";
import { reconcileFunctionName } from "../helpers/reconcile-function-name";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

export function reconcileNamedStaticCall(
  future: NamedStaticCallFuture<string, string>,
  executionState: StaticCallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  let result = reconcileContract(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileFunctionName(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileArguments(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileFrom(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
