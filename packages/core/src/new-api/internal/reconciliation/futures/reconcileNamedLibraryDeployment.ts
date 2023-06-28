import { isEqual } from "lodash";

import { NamedLibraryDeploymentFuture } from "../../../types/module";
import { DeploymentExecutionState } from "../../types/execution-state";
import { resolveFromAddress } from "../../utils/resolve-from-address";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { addressToErrorString, fail } from "../utils";

export function reconcileNamedLibraryDeployment(
  future: NamedLibraryDeploymentFuture<string>,
  executionState: DeploymentExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  if (!isEqual(future.contractName, executionState.contractName)) {
    return fail(
      future,
      `Library name has been changed from ${executionState.contractName} to ${future.contractName}`
    );
  }

  const resolvedLibraries =
    ExecutionStateResolver.resolveLibrariesFromExecutionState(
      future.libraries,
      context
    );

  if (!isEqual(resolvedLibraries, executionState.libraries)) {
    return fail(future, "Libraries have been changed");
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
