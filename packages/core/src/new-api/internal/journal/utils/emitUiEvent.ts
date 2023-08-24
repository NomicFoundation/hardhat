import {
  UiCallResult,
  UiDeploymentResult,
  UiEventListener,
  UiEventType,
  UiResultType,
  UiSendDataResult,
  UiStaticCallResult,
} from "../../../types/ui-events";
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

export function emitUiEvent(
  message: JournalMessage,
  uiEventListener: UiEventListener
): void {
  switch (message.type) {
    case JournalMessageType.RUN_START: {
      uiEventListener[UiEventType.RUN_START]({
        type: UiEventType.RUN_START,
        chainId: message.chainId,
      });
      break;
    }
    case JournalMessageType.WIPE_EXECUTION_STATE: {
      uiEventListener[UiEventType.WIPE_EXECUTION_STATE]({
        type: UiEventType.WIPE_EXECUTION_STATE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[UiEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE]({
        type: UiEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE: {
      uiEventListener[UiEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE]({
        type: UiEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertDeploymentResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[UiEventType.CALL_EXECUTION_STATE_INITIALIZE]({
        type: UiEventType.CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE: {
      uiEventListener[UiEventType.CALL_EXECUTION_STATE_COMPLETE]({
        type: UiEventType.CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertCallResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[UiEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE]({
        type: UiEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE: {
      uiEventListener[UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]({
        type: UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertStaticCallResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[UiEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE]({
        type: UiEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE: {
      uiEventListener[UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE]({
        type: UiEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertSendDataResultToUiResult(message.result),
      });
      break;
    }
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[UiEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE]({
        type: UiEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE: {
      uiEventListener[
        UiEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE
      ]({
        type: UiEventType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE,
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
): UiDeploymentResult {
  if (result.type === ExecutionResultType.SUCCESS) {
    return {
      type: UiResultType.SUCCESS,
      address: result.address,
    };
  }

  return {
    type: UiResultType.ERROR,
    error: result,
  };
}

function convertCallResultToUiResult(
  result: CallExecutionResult
): UiCallResult {}

function convertStaticCallResultToUiResult(
  result: StaticCallExecutionResult
): UiStaticCallResult {}

function convertSendDataResultToUiResult(
  result: SendDataExecutionResult
): UiSendDataResult {}
