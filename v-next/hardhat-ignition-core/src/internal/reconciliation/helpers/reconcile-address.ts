import type {
  ContractAtFuture,
  NamedArtifactContractAtFuture,
} from "../../../types/module";
import type { ContractAtExecutionState } from "../../execution/types/execution-state";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { resolveAddressLike } from "../../execution/future-processor/helpers/future-resolvers";

import { compare } from "./compare";

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
