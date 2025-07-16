import type {
  ContractAtFuture,
  ContractDeploymentFuture,
  LibraryDeploymentFuture,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
} from "../../../types/module.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types.js";

import {
  ExecutionStatus,
  type ContractAtExecutionState,
  type DeploymentExecutionState,
} from "../../execution/types/execution-state.js";
import { fail, getBytecodeWithoutMetadata } from "../utils.js";

export async function reconcileArtifacts(
  future:
    | NamedArtifactContractDeploymentFuture<string>
    | ContractDeploymentFuture
    | NamedArtifactLibraryDeploymentFuture<string>
    | LibraryDeploymentFuture
    | NamedArtifactContractAtFuture<string>
    | ContractAtFuture,
  exState: DeploymentExecutionState | ContractAtExecutionState,
  context: ReconciliationContext,
): Promise<ReconciliationFutureResultFailure | undefined> {
  if (exState.status === ExecutionStatus.SUCCESS) {
    return;
  }

  const moduleArtifact =
    "artifact" in future
      ? future.artifact
      : await context.artifactResolver.loadArtifact(future.contractName);

  const storedArtifact = await context.deploymentLoader.loadArtifact(
    exState.artifactId,
  );

  const moduleArtifactBytecode = getBytecodeWithoutMetadata(
    moduleArtifact.bytecode,
  );
  const storedArtifactBytecode = getBytecodeWithoutMetadata(
    storedArtifact.bytecode,
  );

  if (moduleArtifactBytecode !== storedArtifactBytecode) {
    return fail(future, "Artifact bytecodes have been changed");
  }
}
