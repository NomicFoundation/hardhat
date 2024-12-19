import { ContractCallFuture } from "../../../types/module";
import { CallExecutionState } from "../../execution/types/execution-state";
import { reconcileArguments } from "../helpers/reconcile-arguments";
import { reconcileContract } from "../helpers/reconcile-contract";
import { reconcileFrom } from "../helpers/reconcile-from";
import { reconcileFunctionName } from "../helpers/reconcile-function-name";
import { reconcileStrategy } from "../helpers/reconcile-strategy";
import { reconcileValue } from "../helpers/reconcile-value";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

export function reconcileNamedContractCall(
  future: ContractCallFuture<string, string>,
  executionState: CallExecutionState,
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

  result = reconcileValue(future, executionState, context);
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

  return { success: true };
}
