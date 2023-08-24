import { UiEventEmitter, UiEventType } from "../../../types/ui-events";
import {
  JournalMessage,
  JournalMessageType,
} from "../../new-execution/types/messages";

export function emitUiEvent(
  message: JournalMessage,
  uiEventEmitter: UiEventEmitter
): void {
  switch (message.type) {
    case JournalMessageType.RUN_START: {
      uiEventEmitter.emit(
        UiEventType.RUN_START,
        convertJournalMessageToEventData(message) // helper pseudo-code for now
      );
      break;
    }
    case JournalMessageType.WIPE_EXECUTION_STATE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.WIPE_EXECUTION_STATE case"
      );
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE case"
      );
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE case"
      );
    }
    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE case"
      );
    }
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.CALL_EXECUTION_STATE_COMPLETE case"
      );
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE case"
      );
    }
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE case"
      );
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE case"
      );
    }
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE case"
      );
    }
    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE case"
      );
    }
    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE: {
      throw new Error(
        "Not implemented yet: JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE case"
      );
    }
    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
    case JournalMessageType.TRANSACTION_SEND:
    case JournalMessageType.TRANSACTION_CONFIRM:
    case JournalMessageType.STATIC_CALL_COMPLETE:
    case JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES:
    case JournalMessageType.ONCHAIN_INTERACTION_DROPPED:
    case JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER:
    case JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT:
      return;
  }
}
