import { assertIgnitionInvariant } from "../../../utils/assertions";
import {
  CallExecutionState,
  DeploymentExecutionState,
} from "../../types/execution-state";
import { Transaction } from "../../types/jsonrpc";

import { findOnchainInteractionBy } from "./find-onchain-interaction-by";

export function findTransactionBy(
  executionState: DeploymentExecutionState | CallExecutionState,
  networkInteractionId: number,
  hash: string
): Transaction {
  const onchainInteraction = findOnchainInteractionBy(
    executionState,
    networkInteractionId
  );

  const transaction = onchainInteraction.transactions.find(
    (tx) => tx.hash === hash
  );

  assertIgnitionInvariant(
    transaction !== undefined,
    `Expected transaction ${executionState.id}/${networkInteractionId}/${hash} to exist, but it did not`
  );

  return transaction;
}
