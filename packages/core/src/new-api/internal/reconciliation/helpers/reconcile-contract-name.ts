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

import { compare } from "./compare";

export function reconcileContractName(
  future:
    | NamedContractDeploymentFuture<string>
    | ArtifactContractDeploymentFuture
    | NamedLibraryDeploymentFuture<string>
    | ArtifactLibraryDeploymentFuture
    | NamedContractAtFuture<string>
    | ArtifactContractAtFuture,
  exState: DeploymentExecutionState | ContractAtExecutionState,
  _context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  return compare(
    future,
    "Contract name",
    exState.contractName,
    future.contractName
  );
}
