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

import { compare } from "./compare";

export function reconcileContractName(
  future:
    | NamedArtifactContractDeploymentFuture<string>
    | ContractDeploymentFuture
    | NamedArtifactLibraryDeploymentFuture<string>
    | LibraryDeploymentFuture
    | NamedArtifactContractAtFuture<string>
    | ContractAtFuture,
  exState: DeploymentExecutionState | ContractAtExecutionState,
  _context: ReconciliationContext,
): ReconciliationFutureResultFailure | undefined {
  return compare(
    future,
    "Contract name",
    exState.contractName,
    future.contractName,
  );
}
