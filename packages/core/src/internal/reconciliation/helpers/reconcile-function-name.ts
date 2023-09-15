import { ContractCallFuture, StaticCallFuture } from "../../../types/module";
import {
  CallExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileFunctionName(
  future: ContractCallFuture<string, string> | StaticCallFuture<string, string>,
  exState: CallExecutionState | StaticCallExecutionState,
  _context: ReconciliationContext
): ReconciliationFutureResultFailure | undefined {
  return compare(
    future,
    "Function name",
    exState.functionName,
    future.functionName
  );
}
