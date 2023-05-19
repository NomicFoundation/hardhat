import { isEqual } from "lodash";

import { SendDataExecutionState } from "../../../types/execution-state";
import { SendDataFuture } from "../../../types/module";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { fail, resolveFromAddress, safeToString } from "../utils";

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

  const fromAddress = resolveFromAddress(future.from, context);
  if (!isEqual(fromAddress, executionState.from)) {
    return fail(
      future,
      `From account has been changed from ${
        executionState.from ?? "undefined"
      } to ${safeToString(fromAddress)}`
    );
  }

  return { success: true };
}
