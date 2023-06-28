import { isEqual } from "lodash";

import { SendDataFuture } from "../../../types/module";
import { SendDataExecutionState } from "../../types/execution-state";
import { resolveFromAddress } from "../../utils/resolve-from-address";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { addressToErrorString, fail } from "../utils";

export function reconcileSendData(
  future: SendDataFuture,
  executionState: SendDataExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  const toAddress: string = ExecutionStateResolver.resolveSendDataToAddress(
    future.to,
    context
  );

  if (!isEqual(toAddress, executionState.to)) {
    return fail(
      future,
      `To address has been changed from ${executionState.to} to ${toAddress}`
    );
  }

  if (!isEqual(future.data, executionState.data)) {
    return fail(
      future,
      `Data has been changed from ${executionState.data ?? "undefined"} to ${
        future.data ?? "undefined"
      }`
    );
  }

  if (!isEqual(future.value, executionState.value)) {
    return fail(
      future,
      `Value has been changed from ${executionState.value} to ${future.value}`
    );
  }

  const resolvedFutureFromAddress = resolveFromAddress(future.from, context);
  const executionStateFrom =
    ExecutionStateResolver.resolveFromAddress(executionState);
  if (
    executionStateFrom !== undefined &&
    !isEqual(resolvedFutureFromAddress, executionStateFrom)
  ) {
    return fail(
      future,
      `From account has been changed from ${addressToErrorString(
        executionStateFrom
      )} to ${addressToErrorString(resolvedFutureFromAddress)}`
    );
  }

  return { success: true };
}
