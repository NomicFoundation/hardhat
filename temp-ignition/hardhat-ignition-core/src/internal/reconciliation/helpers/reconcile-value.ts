import {
  ContractCallFuture,
  ContractDeploymentFuture,
  NamedArtifactContractDeploymentFuture,
  SendDataFuture,
} from "../../../types/module";
import { resolveValue } from "../../execution/future-processor/helpers/future-resolvers";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
} from "../../execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileValue(
  future:
    | NamedArtifactContractDeploymentFuture<string>
    | ContractDeploymentFuture
    | ContractCallFuture<string, string>
    | SendDataFuture,
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | SendDataExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const resolvedValue = resolveValue(
    future.value,
    context.deploymentParameters,
    context.deploymentState,
    context.accounts
  );

  return compare(future, "Value", exState.value, resolvedValue);
}
