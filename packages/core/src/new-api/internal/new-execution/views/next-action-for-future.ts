import maxBy from "lodash/maxBy";

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
  if (depExState.networkInteractions.length === 0) {
    return NextAction.RUN_STRATEGY;
  }

  const interaction = maxBy(depExState.networkInteractions, (ni) => ni.id);
  if (interaction !== undefined) {
    switch (interaction.type) {
      case NetworkInteractionType.ONCHAIN_INTERACTION: {
        if (interaction.transactions.length === 0) {
          return NextAction.SEND_TRANSACTION;
        } else if (interaction.transactions.length === 1) {
          const transaction = interaction.transactions[0];

          if (transaction.receipt === undefined) {
            return NextAction.RECEIPT_ONCHAIN_INTERACTION;
          }

          return NextAction.RUN_STRATEGY;
        }
      }
      case NetworkInteractionType.STATIC_CALL: {
        return NextAction.QUERY_STATIC_CALL;
      }
    }
  }

  throw new IgnitionError(
    `Unable to determine next action for deployment execution state ${depExState.id}`
  );
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
