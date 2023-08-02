import {
  isFutureLevelJournalMessage,
  isRunLevelJournalMessage,
  isTransactionLevelJournalMessage,
} from "../../journal/type-guards";
import { JournalableMessage } from "../../journal/types";
import { ExecutionStateMap } from "../types";

import { futureLevelReducer } from "./future-level-reducer";
import { runLevelReducer } from "./run-level-reducer";
import { transactionLevelReducer } from "./transaction-level-reducer";
import { assertUnknownMessageType } from "./utils";

export function executionStateReducer(
  executionStateMap: ExecutionStateMap,
  action: JournalableMessage
): ExecutionStateMap {
  if (isRunLevelJournalMessage(action)) {
    return runLevelReducer(executionStateMap, action);
  }

  if (isFutureLevelJournalMessage(action)) {
    return futureLevelReducer(executionStateMap, action);
  }

  if (isTransactionLevelJournalMessage(action)) {
    return transactionLevelReducer(executionStateMap, action);
  }

  return assertUnknownMessageType(action);
}
