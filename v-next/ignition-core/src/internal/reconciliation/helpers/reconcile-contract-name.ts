import type {
  ContractAtFuture,
  ContractDeploymentFuture,
  LibraryDeploymentFuture,
  NamedArtifactContractAtFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
} from "../../../types/module.js";
import type {
  ContractAtExecutionState,
  DeploymentExecutionState,
} from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types.js";

import { compare } from "./compare.js";

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
