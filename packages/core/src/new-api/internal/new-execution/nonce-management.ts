import { IgnitionError } from "../../../errors";

import { JsonRpcClient } from "./jsonrpc-client";
import { DeploymentState } from "./types/deployment-state";
import { ExecutionSateType } from "./types/execution-state";
import {
  JournalMessageType,
  OnchainInteractionDroppedMessage,
  OnchainInteractionReplacedByUserMessage,
} from "./types/messages";
import { NetworkInteractionType } from "./types/network-interaction";

/**
 * This function is meant to be used to sync the local state's nonces
 * with those of the network.
 *
 * This function has three goals:
 *  - Ensure that we never proceed with Ignition if there are transactions
 *    sent by the user that haven't got enough confirmations yet.
 *  - Detect if the user has repaced a transaction sent by Ignition.
 *  - Distinguish if a transaction not being present in the mempool was
 *    dropped or replaced by the user.
 *
 * The way this function works means that there's one case we don't handle:
 *  - If the user replaces a transaction sent by Ignition with one of theirs
 *    we'll allocate a new nonce for our transaction.
 *  - If the user's transaction gets dropped, we won't reallocate the original
 *    nonce for any of our transactions, and Ignition will eventually fail,
 *    setting one or more ExecutionState as TIMEOUT.
 *  - This is intentional, as reusing user nonces can lead to unexpected
 *    results.
 *  - To understand this better, please consider that a transaction being
 *    dropped by your node doesn't mean that the entire network forgot about it.
 *
 * @param jsonRpcClient The client used to interact with the network.
 * @param deploymentState The current deployment state, which we want to sync.
 * @param requiredConfirmations The amount of confirmations that a transaction
 *  must have before we consider it confirmed.
 * @returns The messages that should be applied to the state.
 */
export async function getNonceSyncMessages(
  jsonRpcClient: JsonRpcClient,
  deploymentState: DeploymentState,
  requiredConfirmations: number
): Promise<
  Array<
    OnchainInteractionReplacedByUserMessage | OnchainInteractionDroppedMessage
  >
> {
  const messages: Array<
    OnchainInteractionReplacedByUserMessage | OnchainInteractionDroppedMessage
  > = [];

  const pendingTransactionsPerSender =
    createMapFromSenderToNonceAndTransactions(deploymentState);

  const block = await jsonRpcClient.getLatestBlock();
  const confirmedBlockNumber = block.number - requiredConfirmations + 1;

  for (const [sender, pendingTransactions] of Object.entries(
    pendingTransactionsPerSender
  )) {
    const safeConfirmationsCount = await jsonRpcClient.getTransactionCount(
      sender,
      confirmedBlockNumber
    );

    const pendingCount = await jsonRpcClient.getTransactionCount(
      sender,
      "pending"
    );

    const latestCount = await jsonRpcClient.getTransactionCount(
      sender,
      "latest"
    );

    // Case 0: We don't have any pending transactions
    if (pendingTransactions.length === 0) {
      if (safeConfirmationsCount !== pendingCount) {
        throw new IgnitionError(
          `You have sent transactions from ${sender}. Please wait until they get ${requiredConfirmations} confirmations before running Ignition again.`
        );
      }
    }

    for (const {
      nonce,
      transactions,
      executionStateId,
      networkInteractionId,
    } of pendingTransactions) {
      const fetchedTransactions = await Promise.all(
        transactions.map((tx) => jsonRpcClient.getTransaction(tx))
      );

      if (fetchedTransactions.some((tx) => tx === undefined)) {
        continue;
      }

      // Case 1: Confirmed transaction with this nonce
      if (latestCount > nonce) {
        // We don't continue until the user's transactions have enough confirmations
        if (safeConfirmationsCount <= nonce) {
          throw new IgnitionError(
            `You have sent a transaction from ${sender} with nonce ${nonce}. Please wait until it gets ${requiredConfirmations} confirmations before running Ignition again.`
          );
        }

        messages.push({
          type: JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
          futureId: executionStateId,
          networkInteractionId,
        });

        continue;
      }

      // Case 2: There's a pending transaction with this nonce sent by the user

      // We first handle confirmed transactions, that'w why this check is safe here
      if (pendingCount > nonce) {
        throw new IgnitionError(
          `You have sent a transaction from ${sender} with nonce ${nonce}. Please wait until it gets ${requiredConfirmations} confirmations before running Ignition again.`
        );
      }

      // Case 3: There's no transaction sent by the user with this nonce, but ours were still dropped

      messages.push({
        type: JournalMessageType.ONCHAIN_INTERACTION_DROPPED,
        futureId: executionStateId,
        networkInteractionId,
      });
    }
  }

  return messages;
}

/**
 * This interface is meant to be used to fetch new nonces for transactions.
 */
export interface NonceManager {
  /**
   * Returns the next nonce for a given sender, throwing if its not the one
   * expected by the network.
   *
   * If a nonce is returned by this method it must be immediately used to
   * send a transaction. If it can't be used, Ignition's execution must be
   * interrupted.
   */
  getNextNonce(sender: string): Promise<number>;
}

/**
 * An implementation of NonceManager that validates the nonces using
 * the _maxUsedNonce params and a JsonRpcClient.
 */
export class JsonRpcNonceManager implements NonceManager {
  constructor(
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _maxUsedNonce: { [sender: string]: number }
  ) {}

  public async getNextNonce(sender: string): Promise<number> {
    const pendingCount = await this._jsonRpcClient.getTransactionCount(
      sender,
      "pending"
    );

    const expectedNonce =
      this._maxUsedNonce[sender] !== undefined
        ? this._maxUsedNonce[sender] + 1
        : pendingCount;

    if (expectedNonce !== pendingCount) {
      throw new IgnitionError(
        `The next nonce for ${sender} should be ${expectedNonce}, but is ${pendingCount}.
          
Please make sure not to send transactions from ${sender} while running this deployment and try again.`
      );
    }

    // The nonce hasn't been used yet, but we update as it will be immediately used.
    this._maxUsedNonce[expectedNonce] = expectedNonce;

    return expectedNonce;
  }
}

export function getMaxNonceUsedBySender(deploymentState: DeploymentState): {
  [sender: string]: number;
} {
  const nonces: {
    [sender: string]: number;
  } = {};
  for (const executionState of Object.values(deploymentState.executionStates)) {
    if (
      executionState.type !== ExecutionSateType.DEPLOYMENT_EXECUTION_STATE &&
      executionState.type !== ExecutionSateType.CALL_EXECUTION_STATE &&
      executionState.type !== ExecutionSateType.SEND_DATA_EXECUTION_STATE
    ) {
      continue;
    }

    for (const interaction of executionState.networkInteractions) {
      if (interaction.type !== NetworkInteractionType.ONCHAIN_INTERACTION) {
        continue;
      }

      if (interaction.nonce === undefined) {
        continue;
      }

      if (nonces[interaction.from] === undefined) {
        nonces[interaction.from] = interaction.nonce;
      } else {
        nonces[interaction.from] = Math.max(
          nonces[interaction.from],
          interaction.nonce
        );
      }
    }
  }

  return nonces;
}

function createMapFromSenderToNonceAndTransactions(
  deploymentState: DeploymentState
): {
  [sender: string]: Array<{
    nonce: number;
    transactions: string[];
    executionStateId: string;
    networkInteractionId: number;
  }>;
} {
  const pendingTransactionsPerAccount: {
    [sender: string]: Array<{
      nonce: number;
      transactions: string[];
      executionStateId: string;
      networkInteractionId: number;
    }>;
  } = {};

  for (const executionState of Object.values(deploymentState.executionStates)) {
    if (
      executionState.type !== ExecutionSateType.DEPLOYMENT_EXECUTION_STATE &&
      executionState.type !== ExecutionSateType.CALL_EXECUTION_STATE &&
      executionState.type !== ExecutionSateType.SEND_DATA_EXECUTION_STATE
    ) {
      continue;
    }

    for (const interaction of executionState.networkInteractions) {
      if (interaction.type !== NetworkInteractionType.ONCHAIN_INTERACTION) {
        continue;
      }

      if (interaction.nonce === undefined) {
        continue;
      }

      if (interaction.transactions.length === 0) {
        continue;
      }

      const confirmedTx = interaction.transactions.find(
        (tx) => tx.receipt !== undefined
      );

      if (confirmedTx !== undefined) {
        continue;
      }

      if (pendingTransactionsPerAccount[interaction.from] === undefined) {
        pendingTransactionsPerAccount[interaction.from] = [];
      }

      pendingTransactionsPerAccount[interaction.from].push({
        nonce: interaction.nonce,
        transactions: interaction.transactions.map((tx) => tx.hash),
        executionStateId: executionState.id,
        networkInteractionId: interaction.id,
      });
    }
  }

  for (const pendingTransactions of Object.values(
    pendingTransactionsPerAccount
  )) {
    pendingTransactions.sort((a, b) => a.nonce - b.nonce);
  }

  return pendingTransactionsPerAccount;
}
