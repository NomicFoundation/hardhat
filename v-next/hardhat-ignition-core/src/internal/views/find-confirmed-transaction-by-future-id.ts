import type { DeploymentState } from "../execution/types/deployment-state";
import type {
  Transaction,
  TransactionReceipt,
} from "../execution/types/jsonrpc";

import { ExecutionSateType } from "../execution/types/execution-state";
import { NetworkInteractionType } from "../execution/types/network-interaction";
import { assertIgnitionInvariant } from "../utils/assertions";

export function findConfirmedTransactionByFutureId(
  deploymentState: DeploymentState,
  futureId: string,
): Omit<Transaction, "receipt"> & {
  receipt: TransactionReceipt;
} {
  const exState = deploymentState.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Cannot resolve tx hash, no execution state for ${futureId}`,
  );

  assertIgnitionInvariant(
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
      exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE ||
      exState.type === ExecutionSateType.CALL_EXECUTION_STATE,
    `Tx hash resolution only supported on execution states with network interactions, ${futureId} is ${exState.type}`,
  );

  const lastNetworkInteraction = exState.networkInteractions.at(-1);

  assertIgnitionInvariant(
    lastNetworkInteraction !== undefined,
    `Tx hash resolution unable to find a network interaction for ${futureId}`,
  );

  assertIgnitionInvariant(
    lastNetworkInteraction.type === NetworkInteractionType.ONCHAIN_INTERACTION,
    "Tx hash resolution only supported onchain interaction",
  );

  // On confirmation only one transaction is preserverd
  const transaction = lastNetworkInteraction.transactions[0];

  assertIgnitionInvariant(
    transaction !== undefined && transaction.receipt !== undefined,
    `Tx hash resolution unable to find confirmed transaction for ${futureId}`,
  );

  return { ...transaction, receipt: transaction.receipt };
}
