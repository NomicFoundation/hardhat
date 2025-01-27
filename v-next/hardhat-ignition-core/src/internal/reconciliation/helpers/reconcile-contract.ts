import { ContractCallFuture, StaticCallFuture } from "../../../types/module";
import { resolveAddressLike } from "../../execution/future-processor/helpers/future-resolvers";
import {
  CallExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileContract(
  future: ContractCallFuture<string, string> | StaticCallFuture<string, string>,
  exState: CallExecutionState | StaticCallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const resolvedAddress = resolveAddressLike(
    future.contract,
    context.deploymentState,
    context.deploymentParameters,
    context.accounts
  );

  return compare(
    future,
    "Contract address",
    exState.contractAddress,
    resolvedAddress,
    ` (future ${future.contract.id})`
  );
}
