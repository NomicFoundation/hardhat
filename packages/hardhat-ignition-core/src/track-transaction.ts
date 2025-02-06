import { pathExists } from "fs-extra";

import { IgnitionError } from "./errors";
import { FileDeploymentLoader } from "./internal/deployment-loader/file-deployment-loader";
import { ERRORS } from "./internal/errors-list";
import {
  applyNewMessage,
  loadDeploymentState,
} from "./internal/execution/deployment-state-helpers";
import { EIP1193JsonRpcClient } from "./internal/execution/jsonrpc-client";
import { EIP1193Provider } from "./types/provider";
import {
  JournalMessageType,
  OnchainInteractionReplacedByUserMessage,
  TransactionPrepareSendMessage,
  TransactionSendMessage,
} from "./internal/execution/types/messages";
import {
  FullTransaction,
  NetworkFees,
} from "./internal/execution/types/jsonrpc";
import { defaultConfig } from "./internal/defaultConfig";
import { assertIgnitionInvariant } from "./internal/utils/assertions";

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
    _b: any
  ) => Promise<any> = applyNewMessage
): Promise<string | void> {
  if (!(await pathExists(deploymentDir))) {
    throw new IgnitionError(ERRORS.TRACK_TRANSACTION.DEPLOYMENT_DIR_NOT_FOUND, {
      deploymentDir,
    });
  }
  const deploymentLoader = new FileDeploymentLoader(deploymentDir);

  const deploymentState = await loadDeploymentState(deploymentLoader);

  if (deploymentState === undefined) {
    throw new IgnitionError(ERRORS.TRACK_TRANSACTION.UNINITIALIZED_DEPLOYMENT, {
      deploymentDir,
    });
  }

  const jsonRpcClient = new EIP1193JsonRpcClient(provider);

  const transaction = await jsonRpcClient.getFullTransaction(txHash);

  if (transaction === undefined) {
    throw new IgnitionError(ERRORS.TRACK_TRANSACTION.TRANSACTION_NOT_FOUND, {
      txHash,
    });
  }

  /**
   * Cases to consider:
   * 1. (happy case) given txhash belongs to prepareSendMessage and no sendMessage is found
   * 2. (user sent known txhash) given txhash matches prepareSendMessage (sender & nonce) but sendMessage is found with matching txhash
   * 3. (user sent unknown txhash) given txhash matches prepareSendMessage (sender & nonce) but sendMessage is found with different txhash
   * 4. (user sent unrelated txhash) given txhash doesn't match any prepareSendMessage (sender & nonce) for the given deployment
   */

  let prepareSendMessage: TransactionPrepareSendMessage | undefined;
  for await (const message of deploymentLoader.readFromJournal()) {
    if (
      message.type !== JournalMessageType.TRANSACTION_SEND &&
      message.type !== JournalMessageType.TRANSACTION_PREPARE_SEND
    ) {
      continue;
    }

    if (
      message.type === JournalMessageType.TRANSACTION_PREPARE_SEND &&
      message.transactionParams.from === transaction.from &&
      message.transactionParams.nonce === transaction.nonce
    ) {
      prepareSendMessage = message;
      continue;
    }

    // case: we found a sendTransaction message that matches our prepareSendMessage
    if (
      prepareSendMessage !== undefined &&
      message.type === JournalMessageType.TRANSACTION_SEND &&
      message.futureId === prepareSendMessage.futureId &&
      message.networkInteractionId ===
        prepareSendMessage.networkInteractionId &&
      message.nonce === prepareSendMessage.transactionParams.nonce
    ) {
      // case: user sent known txhash that we already logged a sendTransaction message for in the journal
      // i believe this would only happen if the user mistakenly sent us a tx for a nonce that we didn't ask for
      // or if the user mistakenly used `npx hardhat ignition track-tx` twice for the same tx
      if (message.transaction.hash === transaction.hash) {
        throw new IgnitionError(ERRORS.TRACK_TRANSACTION.KNOWN_TRANSACTION);
      }

      // case: user sent txhash that differs from the one we have saved in the journal for the same nonce
      // in this case, the user has sent a tx that replaced ours on chain,
      // so we check their tx for the required number of confirmations
      const confirmations = await getTransactionConfirmations(
        jsonRpcClient,
        transaction.hash
      );

      if (confirmations >= requiredConfirmations) {
        const transactionReplacedMessage: OnchainInteractionReplacedByUserMessage =
          {
            futureId: prepareSendMessage.futureId,
            networkInteractionId: prepareSendMessage.networkInteractionId,
            type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
          };

        await applyNewMessageFn(
          transactionReplacedMessage,
          deploymentState,
          deploymentLoader
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
        return `Your deployment has been fixed and will continue with the execution of the "${prepareSendMessage.futureId}" future.

If this is not the expected behavior, please edit your Hardhat Ignition module accordingly before re-running your deployment.`;
      } else {
        throw new IgnitionError(
          ERRORS.TRACK_TRANSACTION.INSUFFICIENT_CONFIRMATIONS
        );
      }
    }
  }

  // we didn't find a prepareSendMessage that matches the nonce of the given txHash
  if (prepareSendMessage === undefined) {
    throw new IgnitionError(ERRORS.TRACK_TRANSACTION.MATCHING_NONCE_NOT_FOUND);
  }

  // we found a prepareSendMessage that matches the nonce of the given txHash and is missing a sendTransaction message
  // but one or more fields of the prepareSendMessage don't match the given txHash
  // in this case, the user has sent a tx that replaced ours on chain,
  // so we check their tx for the required number of confirmations
  if (
    prepareSendMessage.transactionParams.to?.toLowerCase() !==
      transaction.to?.toLowerCase() ||
    prepareSendMessage.transactionParams.value !== transaction.value ||
    prepareSendMessage.transactionParams.data !== transaction.data ||
    prepareSendMessage.transactionParams.from.toLowerCase() !==
      transaction.from.toLowerCase() ||
    prepareSendMessage.transactionParams.nonce !== transaction.nonce ||
    prepareSendMessage.transactionParams.gasLimit !== transaction.gasLimit ||
    !feesEqual(prepareSendMessage.transactionParams.fees, transaction)
  ) {
    const confirmations = await getTransactionConfirmations(
      jsonRpcClient,
      transaction.hash
    );

    if (confirmations >= requiredConfirmations) {
      const transactionReplacedMessage: OnchainInteractionReplacedByUserMessage =
        {
          futureId: prepareSendMessage.futureId,
          networkInteractionId: prepareSendMessage.networkInteractionId,
          type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
        };

      await applyNewMessageFn(
        transactionReplacedMessage,
        deploymentState,
        deploymentLoader
      );

      /**
       * Like above, we tell the user specifically what future will be executed upon re-running the deployment
       * in case the replacement transaction sent by the user was the same transaction that we were going to send.
       *
       * i.e., if the broken transaction was for a future sending 100 ETH to an address, and the user decided to just send it
       * themselves after the deployment failed, we tell them that the future sending 100 ETH will be executed upon re-running
       * the deployment. It is not obvious to the user that that is the case, and it could result in a double send if they assume
       * the opposite.
       */
      return `Your deployment has been fixed and will continue with the execution of the "${prepareSendMessage.futureId}" future.

If this is not the expected behavior, please edit your Hardhat Ignition module accordingly before re-running your deployment.`;
    } else {
      throw new IgnitionError(
        ERRORS.TRACK_TRANSACTION.INSUFFICIENT_CONFIRMATIONS
      );
    }
  }

  // the given txHash perfectly matches our expectations based on the prepareSendMessage
  // we can now create a sendTransaction message and add it to the journal
  const transactionSendMessage: TransactionSendMessage = {
    futureId: prepareSendMessage.futureId,
    networkInteractionId: prepareSendMessage.networkInteractionId,
    nonce: prepareSendMessage.transactionParams.nonce,
    type: JournalMessageType.TRANSACTION_SEND,
    transaction: {
      hash: transaction.hash,
      fees: prepareSendMessage.transactionParams.fees,
    },
  };

  await applyNewMessageFn(
    transactionSendMessage,
    deploymentState,
    deploymentLoader
  );
}

function feesEqual(a: NetworkFees, b: FullTransaction): boolean {
  if ("gasPrice" in a) {
    return a.gasPrice === b.gasPrice;
  }

  return (
    a.maxFeePerGas === b.maxFeePerGas &&
    a.maxPriorityFeePerGas === b.maxPriorityFeePerGas
  );
}

async function getTransactionConfirmations(
  jsonRpcClient: EIP1193JsonRpcClient,
  txHash: string
): Promise<number> {
  const [block, receipt] = await Promise.all([
    jsonRpcClient.getLatestBlock(),
    jsonRpcClient.getTransactionReceipt(txHash),
  ]);

  assertIgnitionInvariant(
    receipt !== undefined,
    "Unable to retrieve transaction receipt"
  );

  return block.number - receipt.blockNumber + 1;
}
