import { isEqual } from "lodash";

import { CallExecutionState } from "../../../types/execution-state";
import { NamedContractCallFuture } from "../../../types/module";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { fail, resolveFromAddress, safeToString } from "../utils";

export function reconcileNamedContractCall(
  future: NamedContractCallFuture<string, string>,
  executionState: CallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  const contractAddress: string =
    ExecutionStateResolver.resolveContractToAddress(future.contract, context);

  if (!isEqual(contractAddress, executionState.contractAddress)) {
    return fail(
      future,
      `Contract address has been changed from ${executionState.contractAddress} to ${contractAddress}`
    );
  }

  if (!isEqual(future.functionName, executionState.functionName)) {
    return fail(
      future,
      `Function name has been changed from ${executionState.functionName} to ${future.functionName}`
    );
  }

  if (!isEqual(future.args, executionState.args)) {
    return fail(future, "Function args have been changed");
  }

  if (!isEqual(future.value, executionState.value)) {
    return fail(
      future,
      `Value has been changed from ${executionState.value} to ${future.value}`
    );
  }

  const fromAddress = resolveFromAddress(future.from, context);
  if (!isEqual(fromAddress, executionState.from)) {
    return fail(
      future,
      `From account has been changed from ${safeToString(
        executionState.from
      )} to ${safeToString(fromAddress)}`
    );
  }

  return { success: true };
}
