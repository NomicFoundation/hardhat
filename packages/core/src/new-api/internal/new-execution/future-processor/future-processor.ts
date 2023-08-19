import { Future } from "../../../types/module";
import { DeploymentLoader } from "../../deployment-loader/types";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { BasicExecutionStrategy } from "../basic-execution-strategy";
import { EIP1193JsonRpcClient } from "../jsonrpc-client";
import {
  runStaticCall,
  sendTransactionForOnchainInteraction,
} from "../network-interactions";
import { deploymentStateReducer } from "../reducers/deployment-state-reducer";
import { replayStrategy } from "../replay-strategy";
import { DeploymentState } from "../types/deployment-state";
import {
  CallExecutionResult,
  DeploymentExecutionResult,
  ExecutionResultType,
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
  OnchainInteractionResponseType,
  SendDataStrategyGenerator,
} from "../types/execution-strategy";
import { JournalMessage, JournalMessageType } from "../types/messages";
import { NetworkInteractionType } from "../types/network-interaction";
import {
  NextAction,
  nextActionForFuture,
} from "../views/next-action-for-future";

import { buildInitializeMessageFor } from "./helpers/build-initialization-message-for";

export class FutureProcessor {
  constructor(
    private _executionEngineState: {
      deploymentState: DeploymentState;
      deploymentLoader: DeploymentLoader;
    },
    private _nextActionDispatch: (
      futureId: string,
      nextAction: NextAction
    ) => Promise<JournalMessage | undefined>
  ) {}

  /**
   *
   * @param future
   * @returns true if the future is complete, or false if need to continue
   * processing later
   */
  public async processFuture(future: Future): Promise<boolean> {
    let exState =
      this._executionEngineState.deploymentState.executionStates[future.id];

    if (exState === undefined) {
      const initMessage = buildInitializeMessageFor(future);

      await this._applyMessage(initMessage);

      exState =
        this._executionEngineState.deploymentState.executionStates[future.id];

      assertIgnitionInvariant(exState !== undefined, "");
    }

    while (exState.status === ExecutionStatus.STARTED) {
      assertIgnitionInvariant(
        exState.type !== ExecutionSateType.CONTRACT_AT_EXECUTION_STATE &&
          exState.type !==
            ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
        `Unexpected ExectutionState ${exState.id} with type ${exState.type}: it should have been immediately completed`
      );

      const nextAction = nextActionForFuture(exState);

      const resultMessage: JournalMessage | undefined =
        await this._nextActionDispatch2(exState, nextAction);

      if (resultMessage === undefined) {
        // continue with the next future
        return false;
      }

      await this._applyMessage(resultMessage);
    }

    return true;
  }

  private async _applyMessage(message: JournalMessage): Promise<void> {
    if (this._shouldBeJournaled(message)) {
      await this._executionEngineState.deploymentLoader.recordToJournal(
        message as any
      );
    }

    if (
      message.type === JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE &&
      message.result.type === ExecutionResultType.SUCCESS
    ) {
      await this._executionEngineState.deploymentLoader.recordDeployedAddress(
        message.futureId,
        message.result.address
      );
    }

    this._executionEngineState.deploymentState = deploymentStateReducer(
      this._executionEngineState.deploymentState,
      message
    );
  }

  private _shouldBeJournaled(message: JournalMessage): boolean {
    if (
      message.type === JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE ||
      message.type === JournalMessageType.CALL_EXECUTION_STATE_COMPLETE ||
      message.type === JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE
    ) {
      // We do not journal simulation errors, as we want to re-run those simulations
      // if the deployment gets resumed.
      if (
        message.result.type === ExecutionResultType.SIMULATION_ERROR ||
        message.result.type === ExecutionResultType.STRATEGY_SIMULATION_ERROR
      ) {
        return false;
      }
    }

    return true;
  }

  private async _nextActionDispatch2(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState,
    nextAction: NextAction
  ): Promise<JournalMessage | undefined> {
    switch (nextAction) {
      case NextAction.RUN_STRATEGY: {
        return this._runStrategy(exState);
      }
      case NextAction.SEND_TRANSACTION: {
        assertIgnitionInvariant(
          exState.type !== ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
          `Unexpected transaction request in StaticCallExecutionState ${exState.id}`
        );

        return this._sendTransaction(exState);
      }
      case NextAction.QUERY_STATIC_CALL: {
        return this._queryStaticCall(exState);
      }
      case NextAction.RECEIPT_ONCHAIN_INTERACTION: {
        assertIgnitionInvariant(
          exState.type !== ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
          `Unexpected transaction request in StaticCallExecutionState ${exState.id}`
        );

        return this._checkTransactions(exState);
      }
    }
  }
  private async _checkTransactions(
    _exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
  ): Promise<JournalMessage | undefined> {
    // Fetch all transactions
    //  Are all dropped?
    //    Throw
    // Try to fetch the receipt of the tx that was not dropped
    // Is it present?
    //    Does it have enough confirmations?
    //       No: return undefined
    //       Yes: return JournalMessageType.TRANSACTION_CONFIRM
    //    Can we wait more? return undefined
    //    Have we bumped too many times? Return JournalMessageType.ONCHAIN_INTERACION_TIMEOUT
    //    return JournalMessageType.BUMP_ONCHAIN_INTERACTION_FEES
    return undefined;
  }

  private async _queryStaticCall(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState
  ): Promise<JournalMessage> {
    const lastNetworkInteraction =
      exState.networkInteractions[exState.networkInteractions.length];

    assertIgnitionInvariant(
      lastNetworkInteraction.type === NetworkInteractionType.STATIC_CALL,
      "Invalid send transaction next action"
    );

    assertIgnitionInvariant(
      lastNetworkInteraction.result === undefined,
      "Invalid send transaction next action"
    );

    const result = await runStaticCall(
      new EIP1193JsonRpcClient(null as any),
      lastNetworkInteraction
    );

    return {
      type: JournalMessageType.STATIC_CALL_COMPLETE,
      futureId: exState.id,
      networkInteractionId: lastNetworkInteraction.id,
      result,
    };
  }

  private async _sendTransaction(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
  ): Promise<JournalMessage> {
    const lastNetworkInteraction =
      exState.networkInteractions[exState.networkInteractions.length];

    assertIgnitionInvariant(
      lastNetworkInteraction.type ===
        NetworkInteractionType.ONCHAIN_INTERACTION,
      "Invalid send transaction next action"
    );

    const generator = await replayStrategy(
      exState,
      new BasicExecutionStrategy(),
      "0x0011223344556677889900112233445566778899",
      (artifactId) =>
        this._executionEngineState.deploymentLoader.loadArtifact(artifactId)
    );

    const result = await sendTransactionForOnchainInteraction(
      new EIP1193JsonRpcClient(null as any),
      lastNetworkInteraction,
      async (_sender: string) => 1,
      async (simulationResult) => {
        const response = await generator.next(simulationResult);

        assertIgnitionInvariant(
          response.value.type === "SIMULATION_SUCCESS_SIGNAL" ||
            response.value.type ===
              ExecutionResultType.STRATEGY_SIMULATION_ERROR ||
            response.value.type === ExecutionResultType.SIMULATION_ERROR,
          "Invalid simulation response from the strategy"
        );

        if (response.value.type === "SIMULATION_SUCCESS_SIGNAL") {
          return undefined;
        }

        return response.value;
      }
    );

    if (result.type === "TRANSACTION") {
      return {
        type: JournalMessageType.TRANSACTION_SEND,
        futureId: exState.id,
        networkInteractionId: lastNetworkInteraction.id,
        transaction: result.transaction,
        nonce: result.nonce,
      };
    }

    switch (exState.type) {
      case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
        return {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result,
        };

      case ExecutionSateType.CALL_EXECUTION_STATE:
        return {
          type: JournalMessageType.CALL_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result,
        };

      case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
        return {
          type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result,
        };
    }
  }

  private async _runStrategy(
    exState:
      | DeploymentExecutionState
      | CallExecutionState
      | SendDataExecutionState
      | StaticCallExecutionState
  ): Promise<JournalMessage> {
    const generator = await replayStrategy(
      exState,
      new BasicExecutionStrategy(),
      "0x0011223344556677889900112233445566778899",
      (artifactId) =>
        this._executionEngineState.deploymentLoader.loadArtifact(artifactId)
    );

    const lastNetworkInteraction =
      exState.networkInteractions[exState.networkInteractions.length];

    let response;
    if (
      lastNetworkInteraction.type === NetworkInteractionType.ONCHAIN_INTERACTION
    ) {
      // We know this is safe because StaticCallExecutionState's can't generate
      // OnchainInteractions.
      const theGenerator = generator as
        | DeploymentStrategyGenerator
        | CallStrategyGenerator
        | SendDataStrategyGenerator;

      const confirmedTx = lastNetworkInteraction.transactions.find(
        (tx) => tx.receipt !== undefined
      );

      assertIgnitionInvariant(
        confirmedTx !== undefined,
        "Trying to advance strategy without confirmed tx in the last network interaction"
      );

      response = await theGenerator.next({
        type: OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION,
        transaction: confirmedTx as any,
      });
    } else {
      assertIgnitionInvariant(
        lastNetworkInteraction.result !== undefined,
        "Trying to advance strategy without result in the last network interaction"
      );

      response = await generator.next(lastNetworkInteraction.result);
    }

    if (response.done !== true) {
      assertIgnitionInvariant(
        response.value.type !== "SIMULATION_SUCCESS_SIGNAL",
        "Invalid SIMULATION_SUCCESS_SIGNAL received"
      );

      return {
        type: JournalMessageType.NETWORK_INTERACTION_REQUEST,
        futureId: exState.id,
        networkInteraction: response.value,
      };
    }

    switch (exState.type) {
      case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
        return {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result: response.value as DeploymentExecutionResult,
        };

      case ExecutionSateType.CALL_EXECUTION_STATE:
        return {
          type: JournalMessageType.CALL_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result: response.value as CallExecutionResult,
        };

      case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
        return {
          type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result: response.value as SendDataExecutionResult,
        };
      case ExecutionSateType.STATIC_CALL_EXECUTION_STATE:
        return {
          type: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE,
          futureId: exState.id,
          result: response.value as StaticCallExecutionResult,
        };
    }
  }
}
