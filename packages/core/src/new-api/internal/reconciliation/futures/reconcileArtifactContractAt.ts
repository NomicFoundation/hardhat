import { ArtifactContractAtFuture } from "../../../types/module";
import { ContractAtExecutionState } from "../../new-execution/types/execution-state";
import { reconcileAddress } from "../helpers/reconcile-address";
import { reconcileArtifacts } from "../helpers/reconcile-artifacts";
import { reconcileContractName } from "../helpers/reconcile-contract-name";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

export function reconcileArtifactContractAt(
  future: ArtifactContractAtFuture,
  executionState: ContractAtExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  let result = reconcileContractName(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileArtifacts(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileAddress(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
