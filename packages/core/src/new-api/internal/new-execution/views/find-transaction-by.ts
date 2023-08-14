import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import { Transaction } from "../types/jsonrpc";

import { findOnchainInteractionBy } from "./find-onchain-interaction-by";

export function findTransactionBy(
  deploymentState: DeploymentState,
  futureId: string,
  networkInteractionId: number,
  hash: string
): Transaction {
  const onchainInteraction = findOnchainInteractionBy(
    deploymentState,
    futureId,
    networkInteractionId
  );

  const transaction = onchainInteraction.transactions.find(
    (tx) => tx.hash === hash
  );

  assertIgnitionInvariant(
    transaction !== undefined,
    `Expected transaction ${futureId}/${networkInteractionId}/${hash} to exist, but it did not`
  );

  return transaction;
}
