import { isEqual } from "lodash";

import { NamedContractCallFuture } from "../../../types/module";
import { CallExecutionState } from "../../execution/types";
import { resolveFromAddress } from "../../utils/resolve-from-address";
import { resolveModuleParameter } from "../../utils/resolve-module-parameter";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { addressToErrorString, fail } from "../utils";

export function reconcileNamedContractCall(
  future: NamedContractCallFuture<string, string>,
  executionState: CallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  const contractAddress: string =
    ExecutionStateResolver.resolveContractAddressToAddress(
      future.contract,
      context
    );

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

  const resolvedArgs = ExecutionStateResolver.resolveArgsFromExectuionState(
    future.args,
    context
  );
  if (!isEqual(resolvedArgs, executionState.args)) {
    return fail(future, "Function args have been changed");
  }

  const resolvedValue =
    typeof future.value === "bigint"
      ? future.value
      : (resolveModuleParameter(future.value, context) as bigint);

  if (!isEqual(resolvedValue, executionState.value)) {
    return fail(
      future,
      `Value has been changed from ${executionState.value} to ${resolvedValue}`
    );
  }

  const resolvedFutureFromAddress = resolveFromAddress(future.from, context);
  const executionStateFrom =
    ExecutionStateResolver.resolveFromAddress(executionState);
  if (
    executionStateFrom !== undefined &&
    !isEqual(resolvedFutureFromAddress, executionStateFrom)
  ) {
    return fail(
      future,
      `From account has been changed from ${addressToErrorString(
        executionStateFrom
      )} to ${addressToErrorString(resolvedFutureFromAddress)}`
    );
  }

  return { success: true };
}
