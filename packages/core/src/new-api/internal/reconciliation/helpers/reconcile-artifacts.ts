import {
  ArtifactContractAtFuture,
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  NamedContractAtFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
} from "../../../types/module";
import {
  ContractAtExecutionState,
  DeploymentExecutionState,
} from "../../new-execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";
import { fail, getBytecodeWithoutMetadata } from "../utils";

export function reconcileArtifacts(
  future:
    | NamedContractDeploymentFuture<string>
    | ArtifactContractDeploymentFuture
    | NamedLibraryDeploymentFuture<string>
    | ArtifactLibraryDeploymentFuture
    | NamedContractAtFuture<string>
    | ArtifactContractAtFuture,
  _exState: DeploymentExecutionState | ContractAtExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const moduleArtifact = context.moduleArtifactMap[future.id];
  const storedArtifact = context.storedArtifactMap[future.id];

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
