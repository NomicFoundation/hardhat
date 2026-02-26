import type {
  ContractCallFuture,
  StaticCallFuture,
} from "../../../types/module.js";
import type {
  CallExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state.js";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types.js";

import { resolveAddressLike } from "../../execution/future-processor/helpers/future-resolvers.js";

import { compare } from "./compare.js";

export function reconcileContract(
  future: ContractCallFuture<string, string> | StaticCallFuture<string, string>,
  exState: CallExecutionState | StaticCallExecutionState,
  context: ReconciliationContext,
): ReconciliationFutureResultFailure | undefined {
  const resolvedAddress = resolveAddressLike(
    future.contract,
    context.deploymentState,
    context.deploymentParameters,
    context.accounts,
  );

  return compare(
    future,
    "Contract address",
    exState.contractAddress,
    resolvedAddress,
    ` (future ${future.contract.id})`,
  );
}
