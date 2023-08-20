import { IgnitionError } from "../../../../errors";
import { Future } from "../../../types/module";
import { DeploymentLoader } from "../../deployment-loader/types";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { applyMessage } from "../apply-message";
import { JsonRpcClient } from "../jsonrpc-client";
import {
  TRANSACTION_SENT_TYPE,
  runStaticCall,
  sendTransactionForOnchainInteraction,
} from "../network-interactions";
import { NonceManager } from "../nonce-management";
import { replayStrategy } from "../replay-strategy";
import { TransactionTrackingTimer } from "../transaction-tracking-timer";
import { DeploymentState } from "../types/deployment-state";
import {
  CallExecutionResult,
  DeploymentExecutionResult,
  ExecutionResultType,
  RevertedTransactionExecutionResult,
  SendDataExecutionResult,
  StaticCallExecutionResult,
} from "../types/execution-result";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  ExecutionStatus,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../types/execution-state";
import {
  CallStrategyGenerator,
  DeploymentStrategyGenerator,
  ExecutionStrategy,
  OnchainInteractionResponseType,
  SIMULATION_SUCCESS_SIGNAL_TYPE,
  SendDataStrategyGenerator,
} from "../types/execution-strategy";
import { TransactionReceiptStatus } from "../types/jsonrpc";
import {
  CallExecutionStateCompleteMessage,
  DeploymentExecutionStateCompleteMessage,
  JournalMessage,
  JournalMessageType,
  NetworkInteractionRequestMessage,
  OnchainInteractionBumpFeesMessage,
  OnchainInteractionTimeoutMessage,
  SendDataExecutionStateCompleteMessage,
  StaticCallCompleteMessage,
  StaticCallExecutionStateCompleteMessage,
  TransactionConfirmMessage,
  TransactionSendMessage,
} from "../types/messages";
import { NetworkInteractionType } from "../types/network-interaction";

import { buildInitializeMessageFor } from "./helpers/build-initialization-message-for";
import {
  NextAction,
  nextActionForExecutionState as nextActionExecutionState,
} from "./helpers/next-action-for-execution-state";

export class FutureProcessor {
  constructor(
    private readonly _deploymentLoader: DeploymentLoader,
    private readonly _executionStrategy: ExecutionStrategy,
    private readonly _jsonRpcClient: JsonRpcClient,
    private readonly _transactionTrackingTimer: TransactionTrackingTimer,
    private readonly _nonceManager: NonceManager,
    private readonly _requiredConfirmations: number,
    private readonly _millisecondBeforeBumpingFees: number,
    private readonly _maxFeeBumps: number
  ) {}

  /**
   * Process a future, executing as much as possible, and returning the new
   * deployment state and a boolean indicating if the future was completed.
   *
   * @param future The future to process.
   * @returns An object with the new state and a boolean indicating if the future
   *  was completed. If it wasn't completed, it should be processed again later,
   *  as there's a transactions awaiting to be confirmed.
   */
  public async processFuture(
    future: Future,
    deploymentState: DeploymentState
  ): Promise<{ futureCompleted: boolean; newState: DeploymentState }> {
    let exState = deploymentState.executionStates[future.id];

    if (exState === undefined) {
      const initMessage = buildInitializeMessageFor(future);

      deploymentState = await applyMessage(
        initMessage,
        deploymentState,
        this._deploymentLoader
      );

      exState = deploymentState.executionStates[future.id];

      assertIgnitionInvariant(
        exState !== undefined,
        `Invalid initialization message for future ${future.id}: it didn't create its execution state`
      );
    }

    while (exState.status === ExecutionStatus.STARTED) {
      assertIgnitionInvariant(
        exState.type !== ExecutionSateType.CONTRACT_AT_EXECUTION_STATE &&
          exState.type !==
            ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
        `Unexpected ExectutionState ${exState.id} with type ${exState.type} and status ${exState.status}: it should have been immediately completed`
      );

      const nextAction = nextActionExecutionState(exState);

      const nextMessage: JournalMessage | undefined =
        await this._nextActionDispatch(exState, nextAction);

      if (nextMessage === undefined) {
        // continue with the next future
        return { futureCompleted: false, newState: deploymentState };
      }

      deploymentState = await applyMessage(
        nextMessage,
        deploymentState,
        this._deploymentLoader
      );

      await this._recordDeployedAddressIfNeeded(nextMessage);
    }

    return { futureCompleted: true, newState: deploymentState };
  }

  /**
   * Records a deployed address if the last applied message was a
   * successful completion of a deployment.
   *
   * @param lastAppliedMessage The last message that was applied to the deployment state.
   */
  private async _recordDeployedAddressIfNeeded(
    lastAppliedMessage: JournalMessage
  ) {
    if (
      lastAppliedMessage.type ===
        JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE &&
      lastAppliedMessage.result.type === ExecutionResultType.SUCCESS
    ) {
      // TODO: record the artifact to support viem?
      // TODO: Should we also save contractAt addresses?
      await this._deploymentLoader.recordDeployedAddress(
        lastAppliedMessage.futureId,
        lastAppliedMessage.result.address
      );
    }
  }

  /**
   * Executes the next action for the execution state, and returns a message to
   * be applied as a result of the execution, or undefined if no progress can be made
   * yet and execution should be resumed later.
   */
  private async _nextActionDispatch(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState,
    nextAction: NextAction
  ): Promise<JournalMessage | undefined> {
    switch (nextAction) {
      case NextAction.RUN_STRATEGY:
        return this._runStrategy(exState);

      case NextAction.SEND_TRANSACTION:
        assertIgnitionInvariant(
          exState.type !== ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
          `Unexpected transaction request in StaticCallExecutionState ${exState.id}`
        );

        return this._sendTransaction(exState);

      case NextAction.QUERY_STATIC_CALL:
        return this._queryStaticCall(exState);

      case NextAction.RECEIPT_ONCHAIN_INTERACTION:
        assertIgnitionInvariant(
          exState.type !== ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
          `Unexpected transaction request in StaticCallExecutionState ${exState.id}`
        );

        return this._checkTransactions(exState);
    }
  }

  /**
   * Checks the transactions of the latest network interaction of the execution state,
   * and returns either a message or undefined if we need to wait for more confirmations.
   *
   * This method can return messages indicating that a transaction has enough confirmations,
   * that we need to bump the fees, or that the execution of this onchain interaction has
   * timed out.
   */
  private async _checkTransactions(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
  ): Promise<
    | TransactionConfirmMessage
    | OnchainInteractionBumpFeesMessage
    | OnchainInteractionTimeoutMessage
    | undefined
  > {
    const lastNetworkInteraction =
      exState.networkInteractions[exState.networkInteractions.length];

    assertIgnitionInvariant(
      lastNetworkInteraction.type ===
        NetworkInteractionType.ONCHAIN_INTERACTION,
      `StaticCall found as last network interaction of ExecutionState ${exState.id} when trying to check its transactions`
    );

    assertIgnitionInvariant(
      lastNetworkInteraction.transactions.length > 0,
      `No transaction found in OnchainInteraction ${exState.id}/${lastNetworkInteraction.id} when trying to check its transactions`
    );

    const transactions = await Promise.all(
      lastNetworkInteraction.transactions.map((tx) =>
        this._jsonRpcClient.getTransaction(tx.hash)
      )
    );

    const transaction = transactions.find((tx) => tx !== undefined);

    // We do not try to recover from dopped transactions mid-execution
    if (transaction === undefined) {
      throw new IgnitionError(
        `Error while executing ${exState.id}: all the transactions of its network interaction ${lastNetworkInteraction.id} were dropped.
        
Please try rerunning Ignition.`
      );
    }

    const [block, receipt] = await Promise.all([
      this._jsonRpcClient.getLatestBlock(),
      this._jsonRpcClient.getTransactionReceipt(transaction.hash),
    ]);

    if (receipt !== undefined) {
      // If the required confirmations are too low our confimations
      // number may be wrong and we should be fetching the receipt's
      // block hash and ensuring that it's still part of the chain.
      //
      // As we use intend to use it with safe required confirmation
      // numbers, reorgs shouldn't be a problem, so we don't do it.
      const confirmations = block.number - receipt.blockNumber + 1;

      if (confirmations >= this._requiredConfirmations) {
        return {
          type: JournalMessageType.TRANSACTION_CONFIRM,
          futureId: exState.id,
          networkInteractionId: lastNetworkInteraction.id,
          hash: transaction.hash,
          receipt,
        };
      }

      return undefined;
    }

    const timeTrackingTx =
      this._transactionTrackingTimer.getTransactionTrackingTime(
        transaction.hash
      );

    if (timeTrackingTx < this._millisecondBeforeBumpingFees) {
      return undefined;
    }

    if (lastNetworkInteraction.transactions.length > this._maxFeeBumps) {
      return {
        type: JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT,
        futureId: exState.id,
        networkInteractionId: lastNetworkInteraction.id,
      };
    }

    return {
      type: JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES,
      futureId: exState.id,
      networkInteractionId: lastNetworkInteraction.id,
    };
  }

  /**
   * Retuns a StaticCall and returns a StaticCallCompleteMessage.
   */
  private async _queryStaticCall(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState
  ): Promise<StaticCallCompleteMessage> {
    const lastNetworkInteraction =
      exState.networkInteractions[exState.networkInteractions.length];

    assertIgnitionInvariant(
      lastNetworkInteraction.type === NetworkInteractionType.STATIC_CALL,
      `Transaction found as last network interaction of ExecutionState ${exState.id} when trying to run a StaticCall`
    );

    assertIgnitionInvariant(
      lastNetworkInteraction.result === undefined,
      `Resolved StaticCall found in ${exState.id}/${lastNetworkInteraction.id} when trying to run it`
    );

    const result = await runStaticCall(
      this._jsonRpcClient,
      lastNetworkInteraction
    );

    return {
      type: JournalMessageType.STATIC_CALL_COMPLETE,
      futureId: exState.id,
      networkInteractionId: lastNetworkInteraction.id,
      result,
    };
  }

  /**
   * Sends a transaction and returns a TransactionSendMessage, or an execution state
   * complete message in case of an error.
   */
  private async _sendTransaction(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
  ): Promise<
    | TransactionSendMessage
    | DeploymentExecutionStateCompleteMessage
    | CallExecutionStateCompleteMessage
    | SendDataExecutionStateCompleteMessage
  > {
    const lastNetworkInteraction =
      exState.networkInteractions[exState.networkInteractions.length];

    assertIgnitionInvariant(
      lastNetworkInteraction.type ===
        NetworkInteractionType.ONCHAIN_INTERACTION,
      `StaticCall found as last network interaction of ExecutionState ${exState.id} when trying to send a transaction`
    );

    const strategyGenerator = await replayStrategy(
      exState,
      this._executionStrategy
    );

    const result = await sendTransactionForOnchainInteraction(
      this._jsonRpcClient,
      lastNetworkInteraction,
      async (_sender: string) => this._nonceManager.getNextNonce(_sender),
      async (simulationResult) => {
        const response = await strategyGenerator.next(simulationResult);

        assertIgnitionInvariant(
          response.value.type === SIMULATION_SUCCESS_SIGNAL_TYPE ||
            response.value.type ===
              ExecutionResultType.STRATEGY_SIMULATION_ERROR ||
            response.value.type === ExecutionResultType.SIMULATION_ERROR,
          `Invalid response received from strategy after a simulation was run before sending a transaction for ExecutionState ${exState.id}`
        );

        if (response.value.type === SIMULATION_SUCCESS_SIGNAL_TYPE) {
          return undefined;
        }

        return response.value;
      }
    );

    if (result.type === TRANSACTION_SENT_TYPE) {
      this._transactionTrackingTimer.addTransaction(result.transaction.hash);

      return {
        type: JournalMessageType.TRANSACTION_SEND,
        futureId: exState.id,
        networkInteractionId: lastNetworkInteraction.id,
        transaction: result.transaction,
        nonce: result.nonce,
      };
    }

    return this._createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
      exState,
      result
    );
  }

  /**
   * Runs the strategy for the execution state, and returns a message that can be
   * a network interaction request, or an execution state complete message.
   *
   * Execution state complete messages can be a result of running the strategy,
   * or of the transaction executing the latest network interaction having reverted.
   */
  private async _runStrategy(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState
  ): Promise<
    | NetworkInteractionRequestMessage
    | DeploymentExecutionStateCompleteMessage
    | CallExecutionStateCompleteMessage
    | SendDataExecutionStateCompleteMessage
    | StaticCallExecutionStateCompleteMessage
  > {
    const strategyGenerator = await replayStrategy(
      exState,
      this._executionStrategy
    );

    const lastNetworkInteraction =
      exState.networkInteractions[exState.networkInteractions.length];

    let response;
    if (
      lastNetworkInteraction.type === NetworkInteractionType.ONCHAIN_INTERACTION
    ) {
      assertIgnitionInvariant(
        exState.type !== ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
        `Unexpected StaticCallExecutionState ${exState.id} with onchain interaction ${lastNetworkInteraction.id} when trying to run a strategy`
      );

      // We know this is safe because StaticCallExecutionState's can't generate
      // OnchainInteractions.
      const typedGenerator = strategyGenerator as
        | DeploymentStrategyGenerator
        | CallStrategyGenerator
        | SendDataStrategyGenerator;

      const confirmedTx = lastNetworkInteraction.transactions.find(
        (tx) => tx.receipt !== undefined
      );

      assertIgnitionInvariant(
        confirmedTx !== undefined && confirmedTx.receipt !== undefined,
        "Trying to advance strategy without confirmed tx in the last network interaction"
      );

      if (confirmedTx.receipt.status === TransactionReceiptStatus.FAILURE) {
        const result: RevertedTransactionExecutionResult = {
          type: ExecutionResultType.REVERTED_TRANSACTION,
        };

        return this._createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
          exState,
          result
        );
      }

      response = await typedGenerator.next({
        type: OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION,
        transaction: confirmedTx as any,
      });
    } else {
      assertIgnitionInvariant(
        lastNetworkInteraction.result !== undefined,
        "Trying to advance strategy without result in the last network interaction"
      );

      response = await strategyGenerator.next(lastNetworkInteraction.result);
    }

    if (response.done !== true) {
      assertIgnitionInvariant(
        response.value.type !== SIMULATION_SUCCESS_SIGNAL_TYPE,
        "Invalid SIMULATION_SUCCESS_SIGNAL received"
      );

      return {
        type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
        futureId: exState.id,
        networkInteraction: response.value,
      };
    }

    return this._createExecutionStateCompleteMessage(exState, response.value);
  }

  /**
   * Creates a message indicating that an execution state is now complete.
   *
   * IMPORTANT NOE: This function is NOT type-safe. It's the caller's responsibility
   * to ensure that the result is of the correct type.
   *
   * @param exState The completed execution state.
   * @param result The result of the execution.
   * @returns The completion message.
   */
  private _createExecutionStateCompleteMessage(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState,
    result:
      | DeploymentExecutionResult
      | CallExecutionResult
      | SendDataExecutionResult
      | StaticCallExecutionResult
  ):
    | DeploymentExecutionStateCompleteMessage
    | CallExecutionStateCompleteMessage
    | SendDataExecutionStateCompleteMessage
    | StaticCallExecutionStateCompleteMessage {
    if (exState.type === ExecutionSateType.STATIC_CALL_EXECUTION_STATE) {
      return {
        type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: exState.id,
        result: result as StaticCallExecutionResult,
      };
    }

    return this._createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
      exState,
      result
    );
  }

  /**
   * Creates a message indicating that an execution state is now complete for
   * execution states that require onchain interactions.
   *
   * IMPORTANT NOE: This function is NOT type-safe. It's the caller's responsibility
   * to ensure that the result is of the correct type.
   *
   * @param exState The completed execution state.
   * @param result The result of the execution.
   * @returns The completion message.
   */
  private _createExecutionStateCompleteMessageForExecutionsWithOnchainInteractions(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState,
    result:
      | DeploymentExecutionResult
      | CallExecutionResult
      | SendDataExecutionResult
  ):
    | DeploymentExecutionStateCompleteMessage
    | CallExecutionStateCompleteMessage
    | SendDataExecutionStateCompleteMessage {
    switch (exState.type) {
      case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
        return {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result: result as DeploymentExecutionResult,
        };

      case ExecutionSateType.CALL_EXECUTION_STATE:
        return {
          type: JournalMessageType.CALL_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result: result as CallExecutionResult,
        };

      case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
        return {
          type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result: result as SendDataExecutionResult,
        };
    }
  }
}
