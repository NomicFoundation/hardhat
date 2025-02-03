import type {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state.js";
import type { Transaction } from "../../execution/types/jsonrpc.js";

import { assertIgnitionInvariant } from "../../utils/assertions.js";

import { findOnchainInteractionBy } from "./find-onchain-interaction-by.js";

export function findTransactionBy(
  executionState:
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState
    | SendDataExecutionState,
  networkInteractionId: number,
  hash: string,
): Transaction {
  const onchainInteraction = findOnchainInteractionBy(
    executionState,
    networkInteractionId,
  );

  const transaction = onchainInteraction.transactions.find(
    (tx) => tx.hash === hash,
  );

  assertIgnitionInvariant(
    transaction !== undefined,
    `Expected transaction ${executionState.id}/${networkInteractionId}/${hash} to exist, but it did not`,
  );

  return transaction;
}
