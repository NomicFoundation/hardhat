import { IgnitionError } from "../../../../errors";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { DeploymentState } from "../types/deployment-state";
import {
  CallExecutionState,
  DeploymentExecutionState,
  ExecutionSateType,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../types/execution-state";
import { NetworkInteractionType } from "../types/network-interaction";

export enum NextAction {
  RUN_STRATEGY = "RUN_STRATEGY",
  SEND_TRANSACTION = "SEND_TRANSACTION",
  QUERY_STATIC_CALL = "QUERY_STATIC_CALL",
  RECEIPT_ONCHAIN_INTERACTION = "RECEIPT_ONCHAIN_INTERACTION",
}

export function nextActionForFuture(
  deployment: DeploymentState,
  futureId: string
): NextAction {
  const exState = deployment.executionStates[futureId];

  assertIgnitionInvariant(
    exState !== undefined,
    `Expected execution state for ${futureId} to exist, but it did not`
  );

  switch (exState.type) {
    case ExecutionSateType.DEPLOYMENT_EXECUTION_STATE:
      return nextActionForDeployment(exState);
    case ExecutionSateType.CALL_EXECUTION_STATE:
      return nextActionForCall(exState);
    case ExecutionSateType.STATIC_CALL_EXECUTION_STATE:
      return nextActionForStaticCall(exState);
    case ExecutionSateType.SEND_DATA_EXECUTION_STATE:
      return nextActionForSendData(exState);
    case ExecutionSateType.CONTRACT_AT_EXECUTION_STATE:
    case ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE:
      throw new IgnitionError(
        `No next action for this execution state type ${exState.type}`
      );
  }
}

function nextActionForDeployment(
  depExState: DeploymentExecutionState
): NextAction {
  const interaction =
    depExState.networkInteractions[depExState.networkInteractions.length - 1];

  if (interaction === undefined) {
    return NextAction.RUN_STRATEGY;
  }

  switch (interaction.type) {
    case NetworkInteractionType.ONCHAIN_INTERACTION: {
      if (interaction.transactions.length === 0) {
        return NextAction.SEND_TRANSACTION;
      } else {
        const receipt = interaction.transactions.find((tx) => tx.receipt);

        if (receipt !== undefined) {
          // We got a confirmed transaction
          return NextAction.RUN_STRATEGY;
        }

        // Wait for confirmations
        return NextAction.RECEIPT_ONCHAIN_INTERACTION;
      }
    }
    case NetworkInteractionType.STATIC_CALL: {
      if (interaction.result !== undefined) {
        return NextAction.RUN_STRATEGY;
      }

      return NextAction.QUERY_STATIC_CALL;
    }
  }
}

function nextActionForCall(_exState: CallExecutionState): NextAction {
  throw new Error("Function not implemented.");
}

function nextActionForStaticCall(
  _exState: StaticCallExecutionState
): NextAction {
  throw new Error("Function not implemented.");
}

function nextActionForSendData(_exState: SendDataExecutionState): NextAction {
  throw new Error("Function not implemented.");
}
