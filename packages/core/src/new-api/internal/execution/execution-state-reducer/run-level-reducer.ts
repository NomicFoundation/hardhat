import { isStartRunMessage, isWipeMessage } from "../../journal/type-guards";
import { RunLevelJournalMessage } from "../../journal/types";
import { ExecutionStateMap, ExecutionStatus } from "../types";

import { assertUnknownMessageType } from "./utils";

export function runLevelReducer(
  executionStateMap: ExecutionStateMap,
  action: RunLevelJournalMessage
): ExecutionStateMap {
  if (isStartRunMessage(action)) {
    return setTimeoutFuturesToStarted(executionStateMap);
  }

  if (isWipeMessage(action)) {
    const updated = {
      ...executionStateMap,
    };

    delete updated[action.futureId];

    return updated;
  }

  return assertUnknownMessageType(action);
}

/**
 * Update the timed out futures to be started so they can be rerun
 * @param executionStateMap - the execution states of all seen futures
 * @returns the execution states with timed out futures moved back to started
 */
function setTimeoutFuturesToStarted(
  executionStateMap: ExecutionStateMap
): ExecutionStateMap {
  return Object.fromEntries(
    Object.entries(executionStateMap).map(([futureId, exState]) => [
      futureId,
      exState.status === ExecutionStatus.TIMEOUT
        ? { ...exState, status: ExecutionStatus.STARTED }
        : exState,
    ])
  );
}
