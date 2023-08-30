import { SendDataFuture } from "../../../types/module";
import { SendDataExecutionState } from "../../new-execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileData(
  future: SendDataFuture,
  exState: SendDataExecutionState,
  _context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  return compare(future, "Data", exState.data, future.data ?? "0x");
}
