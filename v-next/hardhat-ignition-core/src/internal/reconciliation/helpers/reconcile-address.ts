import type {
  ContractAtFuture,
  NamedArtifactContractAtFuture,
} from "../../../types/module.js";
import type { ContractAtExecutionState } from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types.js";

import { resolveAddressLike } from "../../execution/future-processor/helpers/future-resolvers.js";

import { compare } from "./compare.js";

export function reconcileAddress(
  future: NamedArtifactContractAtFuture<string> | ContractAtFuture,
  exState: ContractAtExecutionState,
  context: ReconciliationContext,
): ReconciliationFutureResultFailure | undefined {
  const resolvedAddress = resolveAddressLike(
    future.address,
    context.deploymentState,
    context.deploymentParameters,
    context.accounts,
  );

  return compare(future, "Address", exState.contractAddress, resolvedAddress);
}
