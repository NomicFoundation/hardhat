import { isEqual } from "lodash";

import { NamedContractCallFuture } from "../../../types/module";
import { CallExecutionState } from "../../types/execution-state";
import { resolveFromAddress } from "../../utils/resolve-from-address";
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
      `From account has been changed from ${addressToErrorString(
        executionState.from
      )} to ${addressToErrorString(fromAddress)}`
    );
  }

  return { success: true };
}
