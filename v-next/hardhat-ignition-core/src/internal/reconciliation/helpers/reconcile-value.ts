import type {
  ContractCallFuture,
  ContractDeploymentFuture,
  NamedArtifactContractDeploymentFuture,
  SendDataFuture,
} from "../../../types/module";
import type {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
} from "../../execution/types/execution-state";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { resolveValue } from "../../execution/future-processor/helpers/future-resolvers";

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
  context: ReconciliationContext,
): ReconciliationFutureResultFailure | undefined {
  const resolvedValue = resolveValue(
    future.value,
    context.deploymentParameters,
    context.deploymentState,
    context.accounts,
  );

  return compare(future, "Value", exState.value, resolvedValue);
}
