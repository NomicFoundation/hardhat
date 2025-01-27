import type {
  ReconciliationContext,
  ReconciliationFutureResult,
} from "./types";
import type { Future } from "../../types/module";
import type { ExecutionState } from "../execution/types/execution-state";

import { FutureType } from "../../types/module";

import { fail } from "./utils";

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
