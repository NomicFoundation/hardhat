import type { StaticCallFuture } from "../../../types/module.js";
import type { StaticCallExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types.js";

import { compare } from "../helpers/compare.js";
import { reconcileArguments } from "../helpers/reconcile-arguments.js";
import { reconcileContract } from "../helpers/reconcile-contract.js";
import { reconcileFrom } from "../helpers/reconcile-from.js";
import { reconcileFunctionName } from "../helpers/reconcile-function-name.js";
import { reconcileStrategy } from "../helpers/reconcile-strategy.js";

export function reconcileNamedStaticCall(
  future: StaticCallFuture<string, string>,
  executionState: StaticCallExecutionState,
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
    future.nameOrIndex,
  );
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
