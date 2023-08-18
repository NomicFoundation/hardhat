import { Future } from "../../../types/module";
import { DeploymentLoader } from "../../deployment-loader/types";
import { deploymentStateReducer } from "../reducers/deployment-state-reducer";
import { DeploymentState } from "../types/deployment-state";
import { ExecutionResultType } from "../types/execution-result";
import { JournalMessage, JournalMessageType } from "../types/messages";
import { isExecutionStateComplete } from "../views/is-execution-state-complete";
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
    const exState =
      this._executionEngineState.deploymentState.executionStates[future.id];

    if (exState === undefined) {
      const initMessage = buildInitializeMessageFor(future);

      await this._applyMessage(initMessage);
    }

    while (
      !isExecutionStateComplete(
        this._executionEngineState.deploymentState,
        future.id
      )
    ) {
      const nextAction = nextActionForFuture(
        this._executionEngineState.deploymentState,
        future.id
      );

      const resultMessage: JournalMessage | undefined =
        await this._nextActionDispatch(future.id, nextAction);

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
      message.type === JournalMessageType.CALL_EXECUTION_STATE_COMPLETE
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
}
