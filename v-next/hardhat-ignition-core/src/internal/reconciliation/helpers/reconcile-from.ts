import {
  ContractCallFuture,
  ContractDeploymentFuture,
  LibraryDeploymentFuture,
  NamedArtifactContractDeploymentFuture,
  NamedArtifactLibraryDeploymentFuture,
  SendDataFuture,
  StaticCallFuture,
} from "../../../types/module";
import { resolveFutureFrom } from "../../execution/future-processor/helpers/future-resolvers";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileFrom(
  future:
    | NamedArtifactContractDeploymentFuture<string>
    | ContractDeploymentFuture
    | NamedArtifactLibraryDeploymentFuture<string>
    | LibraryDeploymentFuture
    | ContractCallFuture<string, string>
    | StaticCallFuture<string, string>
    | SendDataFuture,
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
    | StaticCallExecutionState,
  context: ReconciliationContext,
): ReconciliationFutureResultFailure | undefined {
  if (future.from === undefined && context.accounts.includes(exState.from)) {
    return undefined;
  }

  const resolvedFrom = resolveFutureFrom(
    future.from,
    context.accounts,
    context.defaultSender,
  );

  return compare(future, "From account", exState.from, resolvedFrom);
}
