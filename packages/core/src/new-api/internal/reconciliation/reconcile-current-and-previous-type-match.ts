import { Future, FutureType } from "../../types/module";
import { ExecutionState, ExecutionStateMap } from "../execution/types";

import { ReconciliationFutureResult } from "./types";
import { fail } from "./utils";

export function reconcileCurrentAndPreviousTypeMatch(
  future: Future,
  executionState: ExecutionState,
  _context: { executionStateMap: ExecutionStateMap }
): ReconciliationFutureResult {
  if (executionState.futureType === future.type) {
    return { success: true };
  }

  return fail(
    future,
    `Future with id ${future.id} has changed from ${
      FutureType[executionState.futureType]
    } to ${FutureType[future.type]}`
  );
}
