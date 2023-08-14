import { assertIgnitionInvariant } from "../../../utils/assertions";
import { DeploymentExecutionState } from "../../types/execution-state";
import { Transaction } from "../../types/jsonrpc";

import { findOnchainInteractionBy } from "./find-onchain-interaction-by";

export function findTransactionBy(
  deploymentExecutionState: DeploymentExecutionState,
  networkInteractionId: number,
  hash: string
): Transaction {
  const onchainInteraction = findOnchainInteractionBy(
    deploymentExecutionState,
    networkInteractionId
  );

  const transaction = onchainInteraction.transactions.find(
    (tx) => tx.hash === hash
  );

  assertIgnitionInvariant(
    transaction !== undefined,
    `Expected transaction ${deploymentExecutionState.id}/${networkInteractionId}/${hash} to exist, but it did not`
  );

  return transaction;
}
