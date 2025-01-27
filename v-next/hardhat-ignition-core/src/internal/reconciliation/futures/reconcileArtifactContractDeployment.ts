import type { ContractDeploymentFuture } from "../../../types/module";
import type { DeploymentExecutionState } from "../../execution/types/execution-state";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types";

import { reconcileArguments } from "../helpers/reconcile-arguments";
import { reconcileArtifacts } from "../helpers/reconcile-artifacts";
import { reconcileContractName } from "../helpers/reconcile-contract-name";
import { reconcileFrom } from "../helpers/reconcile-from";
import { reconcileLibraries } from "../helpers/reconcile-libraries";
import { reconcileStrategy } from "../helpers/reconcile-strategy";
import { reconcileValue } from "../helpers/reconcile-value";

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
