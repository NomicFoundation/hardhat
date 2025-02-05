import type {
  ContractCallFuture,
  ContractDeploymentFuture,
  NamedArtifactContractDeploymentFuture,
  SendDataFuture,
} from "../../../types/module.js";
import type {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
} from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types.js";

import { resolveValue } from "../../execution/future-processor/helpers/future-resolvers.js";

import { compare } from "./compare.js";

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
