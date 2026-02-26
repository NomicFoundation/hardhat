import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "./types.js";
import type { Future } from "../../types/module.js";
import type { ExecutionState } from "../execution/types/execution-state.js";

import { FutureType } from "../../types/module.js";

import { fail } from "./utils.js";

export function reconcileCurrentAndPreviousTypeMatch(
  future: Future,
  executionState: ExecutionState,
  _context: ReconciliationContext,
): ReconciliationFutureResult {
  if (executionState.futureType === future.type) {
    return { success: true };
  }

  return fail(
    future,
    `Future with id ${future.id} has changed from ${
      FutureType[executionState.futureType]
    } to ${FutureType[future.type]}`,
  );
}
