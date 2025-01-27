import { NamedArtifactContractAtFuture } from "../../../types/module";
import { ContractAtExecutionState } from "../../execution/types/execution-state";
import { reconcileAddress } from "../helpers/reconcile-address";
import { reconcileArtifacts } from "../helpers/reconcile-artifacts";
import { reconcileContractName } from "../helpers/reconcile-contract-name";
import { reconcileStrategy } from "../helpers/reconcile-strategy";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";

export async function reconcileNamedContractAt(
  future: NamedArtifactContractAtFuture<string>,
  executionState: ContractAtExecutionState,
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

  result = reconcileAddress(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  result = reconcileStrategy(future, executionState, context);
  if (result !== undefined) {
    return result;
  }

  return { success: true };
}
