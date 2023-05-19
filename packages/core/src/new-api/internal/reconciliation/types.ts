import { ExecutionState, ExecutionStateMap } from "../../types/execution-state";
import { Future, ModuleParameters } from "../../types/module";

export interface ReconciliationFailure {
  futureId: string;
  failure: string;
}

export interface ReconciliationFutureResultSuccess {
  success: true;
}

export interface ReconciliationFutureResultFailure {
  success: false;
  failure: ReconciliationFailure;
}

export type ReconciliationFutureResult =
  | ReconciliationFutureResultSuccess
  | ReconciliationFutureResultFailure;

export interface ReconciliationResult {
  reconciliationFailures: ReconciliationFailure[];
  missingExecutedFutures: string[];
}

export interface ReconciliationContext {
  executionStateMap: ExecutionStateMap;
  moduleParameters: ModuleParameters;
  accounts: string[];
}

export type ReconciliationCheck = (
  future: Future,
  executionState: ExecutionState,
  context: ReconciliationContext
) => ReconciliationFutureResult;
