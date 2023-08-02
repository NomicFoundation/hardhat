import { TransactionLevelJournalMessage } from "../../journal/types";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { ExecutionState, ExecutionStateMap } from "../types";

import { onchainActionReducer } from "./onchain-action-reducer";

export function transactionLevelReducer(
  executionStateMap: ExecutionStateMap,
  action: TransactionLevelJournalMessage
): ExecutionStateMap {
  const previousExState = executionStateMap[action.futureId];

  assertIgnitionInvariant(
    previousExState !== undefined,
    "On chain message for nonexistant future"
  );

  const updateWithOnchainAction: ExecutionState = {
    ...previousExState,
    history: [...previousExState.history, action],
    onchain: onchainActionReducer(previousExState.onchain, action),
  };

  return {
    ...executionStateMap,
    [action.futureId]: updateWithOnchainAction,
  };
}
