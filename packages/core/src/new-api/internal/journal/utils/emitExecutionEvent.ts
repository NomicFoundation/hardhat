import {
  ExecutionEventListener,
  ExecutionEventType,
  ExecutionEventResult,
  ExecutionEventResultType,
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

import { failedEvmExecutionResultToErrorDescription } from "./failedEvmExecutionResultToErrorDescription";

export function emitExecutionEvent(
  message: JournalMessage,
  executionEventListener: ExecutionEventListener
): void {
  switch (message.type) {
    case JournalMessageType.RUN_START: {
      executionEventListener[ExecutionEventType.RUN_START]({
        type: ExecutionEventType.RUN_START,
        chainId: message.chainId,
      });
      break;
    }
    case JournalMessageType.WIPE_EXECUTION_STATE: {
      executionEventListener[ExecutionEventType.WIPE_EXECUTION_STATE]({
        type: ExecutionEventType.WIPE_EXECUTION_STATE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE: {
      executionEventListener[
        ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE: {
      executionEventListener[
        ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE
      ]({
        type: ExecutionEventType.DEPLOYMENT_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertExecutionResultToEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE: {
      executionEventListener[
        ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE: {
      executionEventListener[ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE]({
        type: ExecutionEventType.CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertExecutionResultToEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE: {
      executionEventListener[
        ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE: {
      executionEventListener[
        ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE
      ]({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertStaticCallResultToExecutionEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE: {
      executionEventListener[
        ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE: {
      executionEventListener[
        ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE
      ]({
        type: ExecutionEventType.STATIC_CALL_EXECUTION_STATE_COMPLETE,
        futureId: message.futureId,
        result: convertExecutionResultToEventResult(message.result),
      });
      break;
    }
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE: {
      executionEventListener[
        ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE
      ]({
        type: ExecutionEventType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
        futureId: message.futureId,
      });
      break;
    }
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE: {
      executionEventListener[
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

function convertExecutionResultToEventResult(
  result:
    | DeploymentExecutionResult
    | CallExecutionResult
    | SendDataExecutionResult
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
  }
}

function convertStaticCallResultToExecutionEventResult(
  result: StaticCallExecutionResult
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
  }
}
