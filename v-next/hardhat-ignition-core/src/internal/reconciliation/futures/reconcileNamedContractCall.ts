import type { ContractCallFuture } from "../../../types/module.js";
import type { CallExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types.js";

import { reconcileArguments } from "../helpers/reconcile-arguments.js";
import { reconcileContract } from "../helpers/reconcile-contract.js";
import { reconcileFrom } from "../helpers/reconcile-from.js";
import { reconcileFunctionName } from "../helpers/reconcile-function-name.js";
import { reconcileStrategy } from "../helpers/reconcile-strategy.js";
import { reconcileValue } from "../helpers/reconcile-value.js";

export function reconcileNamedContractCall(
  future: ContractCallFuture<string, string>,
  executionState: CallExecutionState,
  context: ReconciliationContext,
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
