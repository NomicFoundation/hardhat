import {
  NamedContractCallFuture,
  NamedStaticCallFuture,
} from "../../../types/module";
import { resolveAddressLike } from "../../new-execution/future-processor/helpers/future-resolvers";
import {
  CallExecutionState,
  StaticCallExecutionState,
} from "../../new-execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileContract(
  future:
    | NamedContractCallFuture<string, string>
    | NamedStaticCallFuture<string, string>,
  exState: CallExecutionState | StaticCallExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  const resolvedAddress = resolveAddressLike(
    future.contract,
    context.deploymentState,
    context.deploymentParameters
  );

  return compare(
    future,
    "Contract address",
    exState.contractAddress,
    resolvedAddress,
    ` (future ${future.contract.id})`
  );
}
