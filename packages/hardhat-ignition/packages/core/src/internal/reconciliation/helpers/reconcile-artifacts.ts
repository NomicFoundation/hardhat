import {
  ContractAtFuture,
  ContractDeploymentFuture,
  LibraryDeploymentFuture,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
} from "../../../types/module";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
} from "../../execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";
import { fail, getBytecodeWithoutMetadata } from "../utils";

export async function reconcileArtifacts(
  future:
    | NamedArtifactContractDeploymentFuture<string>
    | ContractDeploymentFuture
    | NamedArtifactLibraryDeploymentFuture<string>
    | LibraryDeploymentFuture
    | NamedArtifactContractAtFuture<string>
    | ContractAtFuture,
  exState: DeploymentExecutionState | ContractAtExecutionState,
  context: ReconciliationContext
): Promise<ReconciliationFutureResultFailure | undefined> {
  const moduleArtifact =
    "artifact" in future
      ? future.artifact
      : await context.artifactResolver.loadArtifact(future.contractName);

  const storedArtifact = await context.deploymentLoader.loadArtifact(
    exState.artifactId
  );

  const moduleArtifactBytecode = getBytecodeWithoutMetadata(
    moduleArtifact.bytecode
  );
  const storedArtifactBytecode = getBytecodeWithoutMetadata(
    storedArtifact.bytecode
  );

  if (moduleArtifactBytecode !== storedArtifactBytecode) {
    return fail(future, "Artifact bytecodes have been changed");
  }
}
