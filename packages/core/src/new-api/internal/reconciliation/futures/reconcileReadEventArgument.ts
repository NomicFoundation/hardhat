import { ReadEventArgumentFuture } from "../../../types/module";
import { ReadEventArgumentExecutionState } from "../../types/execution-state";
import { ExecutionStateResolver } from "../execution-state-resolver";
import { ReconciliationContext, ReconciliationFutureResult } from "../types";
import { fail } from "../utils";

export function reconcileReadEventArgument(
  future: ReadEventArgumentFuture,
  executionState: ReadEventArgumentExecutionState,
  context: ReconciliationContext
): ReconciliationFutureResult {
  if (future.eventName !== executionState.eventName) {
    return fail(
      future,
      `Event name has been changed from ${executionState.eventName} to ${future.eventName}`
    );
  }

  if (future.argumentName !== executionState.argumentName) {
    return fail(
      future,
      `Argument name has been changed from ${executionState.argumentName} to ${future.argumentName}`
    );
  }

  if (future.eventIndex !== executionState.eventIndex) {
    return fail(
      future,
      `Event index has been changed from ${executionState.eventIndex} to ${future.eventIndex}`
    );
  }

  const resolvedEmitterAddress: string =
    ExecutionStateResolver.resolveContractAddressToAddress(
      future.emitter,
      context
    );

  if (resolvedEmitterAddress !== executionState.emitter) {
    return fail(
      future,
      `Emitter has been changed from ${executionState.emitter} to ${resolvedEmitterAddress}`
    );
  }

  return { success: true };
}
