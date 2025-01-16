import type { ArtifactResolver } from "./types/artifact";

import findLastIndex from "lodash/findLastIndex";

import { IgnitionError } from "./errors";
import { builtinChains } from "./internal/chain-config";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ERRORS } from "./internal/errors-list";
import { loadDeploymentState } from "./internal/execution/deployment-state-helpers";
import { ExecutionResultType } from "./internal/execution/types/execution-result";
import {
  ExecutionSateType,
  type CallExecutionState,
  type DeploymentExecutionState,
  type ExecutionState,
  type SendDataExecutionState,
} from "./internal/execution/types/execution-state";
import {
  type Transaction,
  TransactionReceiptStatus,
} from "./internal/execution/types/jsonrpc";
import { JournalMessageType } from "./internal/execution/types/messages";
import { assertIgnitionInvariant } from "./internal/utils/assertions";
import {
  type ListTransactionsResult,
  TransactionStatus,
} from "./types/list-transactions";

/**
 * Returns the transactions associated with a deployment.
 *
 * @param deploymentDir - the directory of the deployment to get the transactions of
 * @param artifactResolver - the artifact resolver to use when loading artifacts
 * for a future
 *
 * @beta
 */
export async function listTransactions(
  deploymentDir: string,
  _artifactResolver: Omit<ArtifactResolver, "getBuildInfo">
): Promise<ListTransactionsResult> {
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new IgnitionError(ERRORS.LIST_TRANSACTIONS.UNINITIALIZED_DEPLOYMENT, {
      deploymentDir,
    });
  }

  const transactions: ListTransactionsResult = [];

  const browserUrl = builtinChains.find(
    ({ chainId }) => chainId === deploymentState.chainId
  );

  for await (const message of deploymentLoader.readFromJournal()) {
    if (message.type !== JournalMessageType.TRANSACTION_SEND) {
      continue;
    }

    const exState = deploymentState.executionStates[message.futureId];

    assertIgnitionInvariant(
      doesSendTransactions(exState),
      "Expected execution state to be a type that sends transactions"
    );

    const networkInteraction =
      exState.networkInteractions[message.networkInteractionId - 1];

    assertIgnitionInvariant(
      networkInteraction.type === "ONCHAIN_INTERACTION",
      "Expected network interaction to be an onchain interaction"
    );

    // this seems redundant, but we use it later to determine pending vs dropped status
    const lastTxIndex = findLastIndex(
      networkInteraction.transactions,
      (tx) => tx.hash === message.transaction.hash
    );

    const transaction = networkInteraction.transactions[lastTxIndex];

    switch (exState.type) {
      case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE: {
        transactions.push({
          type: exState.type,
          from: exState.from,
          txHash: transaction.hash,
          status: getTransactionStatus(
            transaction,
            lastTxIndex === networkInteraction.transactions.length - 1
          ),
          name: exState.contractName,
          address:
            transaction.receipt?.status === TransactionReceiptStatus.SUCCESS
              ? exState.result?.type === ExecutionResultType.SUCCESS
                ? exState.result.address
                : undefined
              : undefined,
          params: exState.constructorArgs,
          value: networkInteraction.value,
          browserUrl: browserUrl?.urls.browserURL,
        });

        break;
      }
      case ExecutionSateType.CALL_EXECUTION_STATE: {
        const artifact = await deploymentLoader.loadArtifact(
          exState.artifactId
        );

        transactions.push({
          type: exState.type,
          from: exState.from,
          txHash: transaction.hash,
          status: getTransactionStatus(
            transaction,
            lastTxIndex === networkInteraction.transactions.length - 1
          ),
          name: `${artifact.contractName}#${exState.functionName}`,
          to: networkInteraction.to,
          params: exState.args,
          value: networkInteraction.value,
          browserUrl: browserUrl?.urls.browserURL,
        });

        break;
      }
      case ExecutionSateType.SEND_DATA_EXECUTION_STATE: {
        transactions.push({
          type: exState.type,
          from: exState.from,
          txHash: transaction.hash,
          status: getTransactionStatus(
            transaction,
            lastTxIndex === networkInteraction.transactions.length - 1
          ),
          to: networkInteraction.to,
          value: networkInteraction.value,
          browserUrl: browserUrl?.urls.browserURL,
        });

        break;
      }
    }
  }

  return transactions;
}

function doesSendTransactions(
  exState: ExecutionState
): exState is
  | DeploymentExecutionState
  | CallExecutionState
  | SendDataExecutionState {
  return (
    exState.type === ExecutionSateType.DEPLOYMENT_EXECUTION_STATE ||
    exState.type === ExecutionSateType.CALL_EXECUTION_STATE ||
    exState.type === ExecutionSateType.SEND_DATA_EXECUTION_STATE
  );
}

function getTransactionStatus(
  transaction: Transaction,
  isFinalTransaction: boolean
): TransactionStatus {
  if (transaction.receipt === undefined) {
    if (isFinalTransaction) {
      return TransactionStatus.PENDING;
    }

    return TransactionStatus.DROPPED;
  }

  if (transaction.receipt.status === TransactionReceiptStatus.SUCCESS) {
    return TransactionStatus.SUCCESS;
  }

  return TransactionStatus.FAILURE;
}
