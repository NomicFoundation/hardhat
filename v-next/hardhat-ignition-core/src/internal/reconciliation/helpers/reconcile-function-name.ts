import type {
  ContractCallFuture,
  EncodeFunctionCallFuture,
  StaticCallFuture,
} from "../../../types/module";
import type {
  CallExecutionState,
  EncodeFunctionCallExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import type {
  ReconciliationContext,
  ReconciliationFutureResultFailure,
} from "../types";

import { compare } from "./compare";

export function reconcileFunctionName(
  future:
    | ContractCallFuture<string, string>
    | StaticCallFuture<string, string>
    | EncodeFunctionCallFuture<string, string>,
  exState:
    | CallExecutionState
    | StaticCallExecutionState
    | EncodeFunctionCallExecutionState,
  _context: ReconciliationContext,
): ReconciliationFutureResultFailure | undefined {
  return compare(
    future,
    "Function name",
    exState.functionName,
    future.functionName,
  );
}
