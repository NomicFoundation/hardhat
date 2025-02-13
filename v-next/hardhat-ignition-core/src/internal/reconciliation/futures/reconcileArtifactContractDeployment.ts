import type { ContractDeploymentFuture } from "../../../types/module.js";
import type { DeploymentExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types.js";

import { reconcileArguments } from "../helpers/reconcile-arguments.js";
import { reconcileArtifacts } from "../helpers/reconcile-artifacts.js";
import { reconcileContractName } from "../helpers/reconcile-contract-name.js";
import { reconcileFrom } from "../helpers/reconcile-from.js";
import { reconcileLibraries } from "../helpers/reconcile-libraries.js";
import { reconcileStrategy } from "../helpers/reconcile-strategy.js";
import { reconcileValue } from "../helpers/reconcile-value.js";

export async function reconcileArtifactContractDeployment(
  future: ContractDeploymentFuture,
  executionState: DeploymentExecutionState,
  context: ReconciliationContext,
): Promise<ReconciliationFutureResult> {
  let result = reconcileContractName(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = await reconcileArtifacts(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileArguments(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileLibraries(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileValue(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileFrom(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileStrategy(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return {
    success: true,
  };
}
