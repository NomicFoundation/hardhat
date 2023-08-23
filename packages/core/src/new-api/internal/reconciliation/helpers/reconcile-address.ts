import {
  ArtifactContractAtFuture,
  NamedContractAtFuture,
} from "../../../types/module";
import { resolveAddressLike } from "../../new-execution/future-processor/helpers/future-resolvers";
import { ContractAtExecutionState } from "../../new-execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileAddress(
  future: NamedContractAtFuture<string> | ArtifactContractAtFuture,
  exState: ContractAtExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const resolvedAddress = resolveAddressLike(
    future.address,
    context.deploymentState,
    context.deploymentParameters
  );

  return compare(future, "Address", exState.contractAddress, resolvedAddress);
}
