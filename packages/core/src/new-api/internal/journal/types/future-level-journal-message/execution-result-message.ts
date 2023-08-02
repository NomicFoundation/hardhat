import { JournalMessageType } from "../journal";

import { ExecutionSuccess } from "./execution-success";

export * from "./execution-success";

/**
 * A journal message indicating the result of executing a future.
 *
 * @beta
 */
export type ExecutionResultMessage =
  | ExecutionSuccess
  | ExecutionFailure
  | ExecutionTimeout
  | ExecutionHold;

/**
 * A journal message indicating a future failed execution.
 *
 * @beta
 */
export interface ExecutionFailure {
  type: JournalMessageType.EXECUTION_FAILURE;
  futureId: string;
  error: Error;
}

/**
 * A journal message indicating a future execution timed out.
 *
 * @beta
 */
export interface ExecutionTimeout {
  type: JournalMessageType.EXECUTION_TIMEOUT;
  futureId: string;
  executionId: number;
  txHash: string;
}

/**
 * A journal message indicating a future's execution was not completed within
 * the timeout.
 *
 * @beta
 */
export interface ExecutionHold {
  type: JournalMessageType.EXECUTION_HOLD;
  futureId: string;
  executionId: number;
}
