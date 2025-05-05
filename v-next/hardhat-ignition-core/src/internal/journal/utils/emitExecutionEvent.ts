import type {
  ExecutionEventListener,
  ExecutionEventResult,
} from "../../../types/execution-events.js";
import type { SolidityParameterType } from "../../../types/module.js";
import type {
  CallExecutionResult,
  DeploymentExecutionResult,
  SendDataExecutionResult,
  StaticCallExecutionResult,
} from "../../execution/types/execution-result.js";
import type { JournalMessage } from "../../execution/types/messages.js";

import {
  ExecutionEventNetworkInteractionType,
  ExecutionEventResultType,
  ExecutionEventType,
} from "../../../types/execution-events.js";
import { ExecutionResultType } from "../../execution/types/execution-result.js";
import { JournalMessageType } from "../../execution/types/messages.js";
import { NetworkInteractionType } from "../../execution/types/network-interaction.js";

import { failedEvmExecutionResultToErrorDescription } from "./failedEvmExecutionResultToErrorDescription.js";

export function emitExecutionEvent(
  message: JournalMessage,
  executionEventListener: ExecutionEventListener,
): void {
  switch (message.type) {
    case JournalMessageType.DEPLOYMENT_INITIALIZE: {
      executionEventListener.deploymentInitialize({
        type: ExecutionEventType.DEPLOYMENT_INITIALIZE,
        chainId: message.chainId,
      });
      break;
    }
    case JournalMessageType.WIPE_APPLY: {
      executionEventListener.wipeApply({
        type: ExecutionEventType.WIPE_APPLY,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE: {
      executionEventListener.deploymentExecutionStateInitialize({
        type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE: {
      executionEventListener.deploymentExecutionStateComplete({
        type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertExecutionResultToEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE: {
      executionEventListener.callExecutionStateInitialize({
        type: ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE: {
      executionEventListener.callExecutionStateComplete({
        type: ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertExecutionResultToEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE: {
      executionEventListener.staticCallExecutionStateInitialize({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE: {
      executionEventListener.staticCallExecutionStateComplete({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertStaticCallResultToExecutionEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.ENCODE_FUNCTION_CALL_EXECUTION_STATE_INITIALIZE: {
      executionEventListener.encodeFunctionCallExecutionStateInitialize({
        type: ExecutionEventType.ENCODE_FUNCTION_CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
        result: {
          type: ExecutionEventResultType.SUCCESS,
          result: message.result,
        },
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE: {
      executionEventListener.sendDataExecutionStateInitialize({
        type: ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE: {
      executionEventListener.sendDataExecutionStateComplete({
        type: ExecutionEventType.SEND_DATA_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertExecutionResultToEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE: {
      executionEventListener.contractAtExecutionStateInitialize({
        type: ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE: {
      executionEventListener.readEventArgumentExecutionStateInitialize({
        type: ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
        result: {
          type: ExecutionEventResultType.SUCCESS,
          result: solidityParamToString(message.result),
        },
      });
      break;
    }
    case JournalMessageType.NETWORK_INTERACTION_REQUEST: {
      executionEventListener.networkInteractionRequest({
        type: ExecutionEventType.NETWORK_INTERACTION_REQUEST,
        networkInteractionType:
          message.networkInteraction.type ===
          NetworkInteractionType.ONCHAIN_INTERACTION
            ? ExecutionEventNetworkInteractionType.ONCHAIN_INTERACTION
            : ExecutionEventNetworkInteractionType.STATIC_CALL,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.TRANSACTION_PREPARE_SEND: {
      executionEventListener.transactionPrepareSend({
        type: ExecutionEventType.TRANSACTION_PREPARE_SEND,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.TRANSACTION_SEND: {
      executionEventListener.transactionSend({
        type: ExecutionEventType.TRANSACTION_SEND,
        futureId: message.futureId,
        hash: message.transaction.hash,
      });
      break;
    }
    case JournalMessageType.TRANSACTION_CONFIRM: {
      executionEventListener.transactionConfirm({
        type: ExecutionEventType.TRANSACTION_CONFIRM,
        futureId: message.futureId,
        hash: message.hash,
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_COMPLETE: {
      executionEventListener.staticCallComplete({
        type: ExecutionEventType.STATIC_CALL_COMPLETE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES: {
      executionEventListener.onchainInteractionBumpFees({
        type: ExecutionEventType.ONCHAIN_INTERACTION_BUMP_FEES,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.ONCHAIN_INTERACTION_DROPPED: {
      executionEventListener.onchainInteractionDropped({
        type: ExecutionEventType.ONCHAIN_INTERACTION_DROPPED,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER: {
      executionEventListener.onchainInteractionReplacedByUser({
        type: ExecutionEventType.ONCHAIN_INTERACTION_REPLACED_BY_USER,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT: {
      executionEventListener.onchainInteractionTimeout({
        type: ExecutionEventType.ONCHAIN_INTERACTION_TIMEOUT,
        futureId: message.futureId,
      });
      break;
    }
  }
}

function convertExecutionResultToEventResult(
  result:
    | DeploymentExecutionResult
    | CallExecutionResult
    | SendDataExecutionResult,
): ExecutionEventResult {
  switch (result.type) {
    case ExecutionResultType.SUCCESS: {
      return {
        type: ExecutionEventResultType.SUCCESS,
        result: "address" in result ? result.address : undefined,
      };
    }
    case ExecutionResultType.STATIC_CALL_ERROR:
    case ExecutionResultType.SIMULATION_ERROR: {
      return {
        type: ExecutionEventResultType.ERROR,
        error: failedEvmExecutionResultToErrorDescription(result.error),
      };
    }
    case ExecutionResultType.STRATEGY_ERROR:
    case ExecutionResultType.STRATEGY_SIMULATION_ERROR: {
      return {
        type: ExecutionEventResultType.ERROR,
        error: result.error,
      };
    }
    case ExecutionResultType.REVERTED_TRANSACTION: {
      return {
        type: ExecutionEventResultType.ERROR,
        error: "Transaction reverted",
      };
    }
    case ExecutionResultType.STRATEGY_HELD: {
      return {
        type: ExecutionEventResultType.HELD,
        heldId: result.heldId,
        reason: result.reason,
      };
    }
  }
}

function convertStaticCallResultToExecutionEventResult(
  result: StaticCallExecutionResult,
): ExecutionEventResult {
  switch (result.type) {
    case ExecutionResultType.SUCCESS: {
      return {
        type: ExecutionEventResultType.SUCCESS,
      };
    }
    case ExecutionResultType.STATIC_CALL_ERROR: {
      return {
        type: ExecutionEventResultType.ERROR,
        error: failedEvmExecutionResultToErrorDescription(result.error),
      };
    }
    case ExecutionResultType.STRATEGY_ERROR: {
      return {
        type: ExecutionEventResultType.ERROR,
        error: result.error,
      };
    }
    case ExecutionResultType.STRATEGY_HELD: {
      return {
        type: ExecutionEventResultType.HELD,
        heldId: result.heldId,
        reason: result.reason,
      };
    }
  }
}

function solidityParamToString(param: SolidityParameterType): string {
  if (typeof param === "object") {
    return JSON.stringify(param);
  }

  if (typeof param === "string") {
    return param;
  }

  return param.toString();
}
