import type { ArtifactResolver } from "./types/artifact";

import { IgnitionError } from "./errors";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ERRORS } from "./internal/errors-list";
import {
  getExecutionOrder,
  loadDeploymentState,
} from "./internal/execution/deployment-state-helpers";
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

  const executionOrder = await getExecutionOrder(deploymentLoader);
  const transactions: ListTransactionsResult = [];

  for (const futureId of executionOrder) {
    const exState = deploymentState.executionStates[futureId];

    if (!doesSendTransactions(exState)) {
      continue;
    }

    for (const networkInteraction of exState.networkInteractions) {
      assertIgnitionInvariant(
        networkInteraction.type === "ONCHAIN_INTERACTION",
        "Expected network interaction to be an onchain interaction"
      );

      for (const transaction of networkInteraction.transactions) {
        switch (exState.type) {
          case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE: {
            transactions.push({
              type: exState.type,
              from: exState.from,
              txHash: transaction.hash,
              status: getTransactionStatus(transaction),
              name: exState.contractName,
              address:
                transaction.receipt?.status === TransactionReceiptStatus.SUCCESS
                  ? exState.result?.type === ExecutionResultType.SUCCESS
                    ? exState.result.address
                    : undefined
                  : undefined,
              params: exState.constructorArgs,
              value: networkInteraction.value,
            });

            break;
          }
          case ExecutionSateType.CALL_EXECUTION_STATE: {
            transactions.push({
              type: exState.type,
              from: exState.from,
              txHash: transaction.hash,
              status: getTransactionStatus(transaction),
              name: exState.functionName,
              to: networkInteraction.to,
              params: exState.args,
              value: networkInteraction.value,
            });

            break;
          }
          case ExecutionSateType.SEND_DATA_EXECUTION_STATE: {
            transactions.push({
              type: exState.type,
              from: exState.from,
              txHash: transaction.hash,
              status: getTransactionStatus(transaction),
              to: networkInteraction.to,
              value: networkInteraction.value,
            });

            break;
          }
        }
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

function getTransactionStatus(transaction: Transaction): TransactionStatus {
  const status =
    transaction.receipt === undefined
      ? TransactionStatus.DROPPED
      : transaction.receipt.status === TransactionReceiptStatus.SUCCESS
      ? TransactionStatus.SUCCESS
      : TransactionStatus.FAILURE;

  return status;
}
