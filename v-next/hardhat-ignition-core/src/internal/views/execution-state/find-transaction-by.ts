import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../../execution/types/execution-state";
import { Transaction } from "../../execution/types/jsonrpc";
import { assertIgnitionInvariant } from "../../utils/assertions";

import { findOnchainInteractionBy } from "./find-onchain-interaction-by";

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
