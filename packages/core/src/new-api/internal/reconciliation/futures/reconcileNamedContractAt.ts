import { isEqual } from "lodash";

import { NamedContractAtFuture } from "../../../types/module";
import { ContractAtExecutionState } from "../../types/execution-state";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { fail, getBytecodeWithoutMetadata } from "../utils";

export function reconcileNamedContractAt(
  future: NamedContractAtFuture<string>,
  executionState: ContractAtExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  if (!isEqual(future.contractName, executionState.contractName)) {
    return fail(
      future,
      `Contract name has been changed from ${executionState.contractName} to ${future.contractName}`
    );
  }

  const moduleArtifact = context.moduleArtifactMap[future.id];
  const storedArtifact = context.storedArtifactMap[future.id];

  const moduleArtifactBytecode = getBytecodeWithoutMetadata(
    moduleArtifact.bytecode
  );
  const storedArtifactBytecode = getBytecodeWithoutMetadata(
    storedArtifact.bytecode
  );

  if (!isEqual(moduleArtifactBytecode, storedArtifactBytecode)) {
    return fail(future, "Artifact bytecodes have been changed");
  }

  const resolvedAddress: string =
    ExecutionStateResolver.resolveStaticCallResultToAddress(
      future.address,
      context
    );

  if (!isEqual(resolvedAddress, executionState.contractAddress)) {
    return fail(
      future,
      `Address has been changed from ${executionState.contractAddress} to ${resolvedAddress}`
    );
  }

  return { success: true };
}
