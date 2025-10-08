import type { DeploymentState } from "./internal/execution/types/deployment-state.js";
import type {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "./internal/execution/types/execution-state.js";
import type {
  FullTransaction,
  NetworkFees,
} from "./internal/execution/types/jsonrpc.js";
import type {
  OnchainInteractionReplacedByUserMessage,
  TransactionSendMessage,
} from "./internal/execution/types/messages.js";
import type { OnchainInteraction } from "./internal/execution/types/network-interaction.js";
import type { EIP1193Provider } from "./types/provider.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { defaultConfig } from "./internal/defaultConfig.js";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader.js";
import {
  applyNewMessage,
  loadDeploymentState,
} from "./internal/execution/deployment-state-helpers.js";
import { EIP1193JsonRpcClient } from "./internal/execution/jsonrpc-client.js";
import { JournalMessageType } from "./internal/execution/types/messages.js";
import { NetworkInteractionType } from "./internal/execution/types/network-interaction.js";
import { assertIgnitionInvariant } from "./internal/utils/assertions.js";
import { getNetworkExecutionStates } from "./internal/views/execution-state/get-network-execution-states.js";

/**
 * Tracks a transaction associated with a given deployment.
 *
 * @param deploymentDir - the directory of the deployment the transaction belongs to
 * @param txHash - the hash of the transaction to track
 * @param provider - a JSON RPC provider to retrieve transaction information from
 * @param requiredConfirmations - the number of confirmations required for the transaction to be considered confirmed
 * @param applyNewMessageFn - only used for ease of testing this function and should not be used otherwise
 *
 * @beta
 */
export async function trackTransaction(
  deploymentDir: string,
  txHash: string,
  provider: EIP1193Provider,
  requiredConfirmations: number = defaultConfig.requiredConfirmations,
  applyNewMessageFn: (
    message: any,
    _a: any,
    _b: any,
  ) => Promise<any> = applyNewMessage,
): Promise<string | void> {
  if (!(await exists(deploymentDir))) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.TRACK_TRANSACTIONS.DEPLOYMENT_DIR_NOT_FOUND,
      {
        deploymentDir,
      },
    );
  }
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.TRACK_TRANSACTIONS.UNINITIALIZED_DEPLOYMENT,
      {
        deploymentDir,
      },
    );
  }

  const jsonRpcClient = new EIP1193JsonRpcClient(provider);

  const transaction = await jsonRpcClient.getFullTransaction(txHash);

  if (transaction === undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.TRACK_TRANSACTIONS.TRANSACTION_NOT_FOUND,
      {
        txHash,
      },
    );
  }

  const exStates = getNetworkExecutionStates(deploymentState);

  /**
   * Cases to consider:
   * 1. (happy case) given txhash matches a nonce we prepared but didn't record sending
   * 2. (user replaced with different tx) given txhash matches a nonce we prepared but didn't record sending,
   *     but the tx details are different
   * 3. (user sent known txhash) given txhash matches a nonce we recorded sending with the same txhash
   * 4. (user sent unknown txhash) given txhash matches a nonce we recorded sending but with a different txhash
   * 5. (user sent unrelated txhash) given txhash doesn't match any nonce we've allocated
   */
  for (const exState of exStates) {
    for (const networkInteraction of exState.networkInteractions) {
      if (
        networkInteraction.type ===
          NetworkInteractionType.ONCHAIN_INTERACTION &&
        exState.from.toLowerCase() === transaction.from.toLowerCase() &&
        networkInteraction.nonce === transaction.nonce
      ) {
        if (networkInteraction.transactions.length === 0) {
          // case 1: the txHash matches a transaction we appear to have sent
          if (
            networkInteraction.to?.toLowerCase() ===
              transaction.to?.toLowerCase() &&
            networkInteraction.data === transaction.data &&
            networkInteraction.value === transaction.value
          ) {
            let fees: NetworkFees;
            if (
              "maxFeePerGas" in transaction &&
              "maxPriorityFeePerGas" in transaction &&
              transaction.maxFeePerGas !== undefined &&
              transaction.maxPriorityFeePerGas !== undefined
            ) {
              fees = {
                maxFeePerGas: transaction.maxFeePerGas,
                maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
              };
            } else {
              assertIgnitionInvariant(
                "gasPrice" in transaction && transaction.gasPrice !== undefined,
                "Transaction fees are missing",
              );

              fees = {
                gasPrice: transaction.gasPrice,
              };
            }

            const transactionSendMessage: TransactionSendMessage = {
              futureId: exState.id,
              networkInteractionId: networkInteraction.id,
              nonce: networkInteraction.nonce,
              type: JournalMessageType.TRANSACTION_SEND,
              transaction: {
                hash: transaction.hash,
                fees,
              },
            };

            await applyNewMessageFn(
              transactionSendMessage,
              deploymentState,
              deploymentLoader,
            );

            return;
          }
          // case 2: the user sent a different transaction that replaced ours
          // so we check their transaction for the required number of confirmations
          else {
            return checkConfirmations(
              exState,
              networkInteraction,
              transaction,
              requiredConfirmations,
              jsonRpcClient,
              deploymentState,
              deploymentLoader,
              applyNewMessageFn,
            );
          }
        }
        // case: the user gave us a transaction that matches a nonce we've already recorded sending from
        else {
          // case 3: the txHash matches the one we have saved in the journal for the same nonce
          if (networkInteraction.transactions[0].hash === transaction.hash) {
            throw new HardhatError(
              HardhatError.ERRORS.IGNITION.TRACK_TRANSACTIONS.KNOWN_TRANSACTION,
            );
          }

          // case 4: the user sent a different transaction that replaced ours
          // so we check their transaction for the required number of confirmations
          return checkConfirmations(
            exState,
            networkInteraction,
            transaction,
            requiredConfirmations,
            jsonRpcClient,
            deploymentState,
            deploymentLoader,
            applyNewMessageFn,
          );
        }
      }
    }
  }

  // case 5: the txHash doesn't match any nonce we've allocated
  throw new HardhatError(
    HardhatError.ERRORS.IGNITION.TRACK_TRANSACTIONS.MATCHING_NONCE_NOT_FOUND,
  );
}

async function checkConfirmations(
  exState:
    | DeploymentExecutionState
    | CallExecutionState
    | StaticCallExecutionState
    | SendDataExecutionState,
  networkInteraction: OnchainInteraction,
  transaction: FullTransaction,
  requiredConfirmations: number,
  jsonRpcClient: EIP1193JsonRpcClient,
  deploymentState: DeploymentState,
  deploymentLoader: FileDeploymentLoader,
  applyNewMessageFn: (message: any, _a: any, _b: any) => Promise<any>,
) {
  const [block, receipt] = await Promise.all([
    jsonRpcClient.getLatestBlock(),
    jsonRpcClient.getTransactionReceipt(transaction.hash),
  ]);

  assertIgnitionInvariant(
    receipt !== undefined,
    "Unable to retrieve transaction receipt",
  );

  const confirmations = block.number - receipt.blockNumber + 1;

  if (confirmations >= requiredConfirmations) {
    const transactionReplacedMessage: OnchainInteractionReplacedByUserMessage =
      {
        futureId: exState.id,
        networkInteractionId: networkInteraction.id,
        type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
      };

    await applyNewMessageFn(
      transactionReplacedMessage,
      deploymentState,
      deploymentLoader,
    );

    /**
     * We tell the user specifically what future will be executed upon re-running the deployment
     * in case the replacement transaction sent by the user was the same transaction that we were going to send.
     *
     * i.e., if the broken transaction was for a future sending 100 ETH to an address, and the user decided to just send it
     * themselves after the deployment failed, we tell them that the future sending 100 ETH will be executed upon re-running
     * the deployment. It is not obvious to the user that that is the case, and it could result in a double send if they assume
     * the opposite.
     */
    return `Your deployment has been fixed and will continue with the execution of the "${exState.id}" future.

If this is not the expected behavior, please edit your Hardhat Ignition module accordingly before re-running your deployment.`;
  } else {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.TRACK_TRANSACTIONS.INSUFFICIENT_CONFIRMATIONS,
    );
  }
}
