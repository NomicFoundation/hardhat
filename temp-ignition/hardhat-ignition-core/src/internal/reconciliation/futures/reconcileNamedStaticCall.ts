import { StaticCallFuture } from "../../../types/module";
import { StaticCallExecutionState } from "../../execution/types/execution-state";
import { compare } from "../helpers/compare";
import { reconcileArguments } from "../helpers/reconcile-arguments";
import { reconcileContract } from "../helpers/reconcile-contract";
import { reconcileFrom } from "../helpers/reconcile-from";
import { reconcileFunctionName } from "../helpers/reconcile-function-name";
import { reconcileStrategy } from "../helpers/reconcile-strategy";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

export function reconcileNamedStaticCall(
  future: StaticCallFuture<string, string>,
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

  result = reconcileStrategy(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = compare(
    future,
    "Argument name or index",
    executionState.nameOrIndex,
    future.nameOrIndex
  );
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
