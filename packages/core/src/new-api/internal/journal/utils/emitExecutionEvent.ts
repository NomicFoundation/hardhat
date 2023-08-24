import {
  CallExecutionEventResult,
  DeploymentExecutionEventResult,
  ExecutionEventListener,
  ExecutionEventType,
  ExecutionEventResultType,
  SendDataExecutionEventResult,
  StaticCallExecutionEventResult,
} from "../../../types/execution-events";
import {
  CallExecutionResult,
  DeploymentExecutionResult,
  ExecutionResultType,
  SendDataExecutionResult,
  StaticCallExecutionResult,
} from "../../new-execution/types/execution-result";
import {
  JournalMessage,
  JournalMessageType,
} from "../../new-execution/types/messages";

export function emitExecutionEvent(
  message: JournalMessage,
  uiEventListener: ExecutionEventListener
): void {
  switch (message.type) {
    case JournalMessageType.RUN_START: {
      uiEventListener[ExecutionEventType.RUN_START]({
        type: ExecutionEventType.RUN_START,
        chainId: message.chainId,
      });
      break;
    }
    case JournalMessageType.WIPE_EXECUTION_STATE: {
      uiEventListener[ExecutionEventType.WIPE_EXECUTION_STATE]({
        type: ExecutionEventType.WIPE_EXECUTION_STATE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE](
        {
          type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: message.futureId,
        }
      );
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE: {
      uiEventListener[ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]({
        type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertDeploymentResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE]({
        type: ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE: {
      uiEventListener[ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE]({
        type: ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertCallResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[
        ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE: {
      uiEventListener[ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertStaticCallResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]({
        type: ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE: {
      uiEventListener[ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertSendDataResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[
        ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[
        ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
    case JournalMessageType.TRANSACTION_SEND:
    case JournalMessageType.TRANSACTION_CONFIRM:
    case JournalMessageType.STATIC_CALL_COMPLETE:
    case JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES:
    case JournalMessageType.ONCHAIN_INTERACTION_DROPPED:
    case JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER:
    case JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT:
      // todo: implement these as well
      return;
  }
}

function convertDeploymentResultToUiResult(
  result: DeploymentExecutionResult
): DeploymentExecutionEventResult {
  if (result.type === ExecutionResultType.SUCCESS) {
    return {
      type: ExecutionEventResultType.SUCCESS,
      address: result.address,
    };
  }

  return {
    type: ExecutionEventResultType.ERROR,
    error: result,
  };
}

function convertCallResultToUiResult(
  result: CallExecutionResult
): CallExecutionEventResult {}

function convertStaticCallResultToUiResult(
  result: StaticCallExecutionResult
): StaticCallExecutionEventResult {}

function convertSendDataResultToUiResult(
  result: SendDataExecutionResult
): SendDataExecutionEventResult {}
