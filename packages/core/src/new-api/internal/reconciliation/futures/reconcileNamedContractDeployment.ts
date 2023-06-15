import { isEqual } from "lodash";

import { NamedContractDeploymentFuture } from "../../../types/module";
import { DeploymentExecutionState } from "../../types/execution-state";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { fail, resolveFromAddress, safeToString } from "../utils";

export function reconcileNamedContractDeployment(
  future: NamedContractDeploymentFuture<string>,
  executionState: DeploymentExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  if (!isEqual(future.contractName, executionState.contractName)) {
    return fail(
      future,
      `Contract name has been changed from ${executionState.contractName} to ${future.contractName}`
    );
  }

  const resolvedArgs = ExecutionStateResolver.resolveArgsFromExectuionState(
    future.constructorArgs,
    context
  );
  if (!isEqual(resolvedArgs, executionState.constructorArgs)) {
    return fail(future, "Constructor args have been changed");
  }

  const resolvedLibraries =
    ExecutionStateResolver.resolveLibrariesFromExecutionState(
      future.libraries,
      context
    );

  if (!isEqual(resolvedLibraries, executionState.libraries)) {
    return fail(future, "Libraries have been changed");
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

  return {
    success: true,
  };
}
