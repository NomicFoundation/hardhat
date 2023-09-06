import {
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
  SendDataFuture,
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
    | NamedContractDeploymentFuture<string>
    | ArtifactContractDeploymentFuture
    | NamedLibraryDeploymentFuture<string>
    | ArtifactLibraryDeploymentFuture
    | NamedContractCallFuture<string, string>
    | NamedStaticCallFuture<string, string>
    | SendDataFuture,
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState
    | StaticCallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const resolvedFrom = resolveFutureFrom(
    future.from,
    context.accounts,
    context.defaultSender
  );

  return compare(future, "From account", exState.from, resolvedFrom);
}
