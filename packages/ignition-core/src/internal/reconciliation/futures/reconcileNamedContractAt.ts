import type { NamedArtifactContractAtFuture } from "../../../types/module.js";
import type { ContractAtExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "../types.js";

import { reconcileAddress } from "../helpers/reconcile-address.js";
import { reconcileArtifacts } from "../helpers/reconcile-artifacts.js";
import { reconcileContractName } from "../helpers/reconcile-contract-name.js";
import { reconcileStrategy } from "../helpers/reconcile-strategy.js";

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
