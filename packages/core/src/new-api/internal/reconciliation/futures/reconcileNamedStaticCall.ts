import { isEqual } from "lodash";

import { NamedStaticCallFuture } from "../../../types/module";
import { StaticCallExecutionState } from "../../types/execution-state";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { fail, resolveFromAddress, safeToString } from "../utils";

export function reconcileNamedStaticCall(
  future: NamedStaticCallFuture<string, string>,
  executionState: StaticCallExecutionState,
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

  const resolvedArgs = ExecutionStateResolver.resolveArgsFromExectuionState(
    future.args,
    context
  );
  if (!isEqual(resolvedArgs, executionState.args)) {
    return fail(future, "Function args have been changed");
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
