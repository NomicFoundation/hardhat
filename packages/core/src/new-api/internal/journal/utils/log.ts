import { ExecutionResultType } from "../../new-execution/types/execution-result";
import {
  JournalMessage,
  JournalMessageType,
} from "../../new-execution/types/messages";
import { NetworkInteractionType } from "../../new-execution/types/network-interaction";

export function logJournalableMessage(message: JournalMessage): void {
  /* run messages */

  switch (message.type) {
    case JournalMessageType.RUN_START:
      console.log(`deployment run starting`);
      break;

    case JournalMessageType.WIPE_EXECUTION_STATE: {
      console.log(
        `Removing the execution of future ${message.futureId} from the journal`
      );
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Starting to execute the deployment future ${message.futureId}`
      );
      break;

    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
      console.log(`Starting to execute the call future ${message.futureId}`);
      break;

    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Starting to execute the static call future ${message.futureId}`
      );
      break;

    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Started to execute the send data future ${message.futureId}`
      );
      break;

    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE:
    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE:
    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE:
      if (message.result.type === ExecutionResultType.SUCCESS) {
        console.log(
          `Successfully completed the execution of future ${message.futureId}`
        );
      } else {
        console.log(
          `Unsuccessfully completed the execution of future ${message.futureId}`
        );
      }
      break;

    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE:
      console.log(`Executed contract at future ${message.futureId}`);
      break;

    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE:
      console.log(`Executed read event argument future ${message.futureId}`);
      break;

    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      if (
        message.networkInteraction.type ===
        NetworkInteractionType.ONCHAIN_INTERACTION
      ) {
        console.log(
          `New onchain interaction requested for future ${message.futureId}`
        );
      } else {
        console.log(`New static call requested for future ${message.futureId}`);
      }
      break;

    case JournalMessageType.TRANSACTION_SEND:
      console.log(
        `Transaction ${message.transaction.hash} sent for future ${message.futureId}`
      );
      break;

    case JournalMessageType.TRANSACTION_CONFIRM:
      console.log(`Transaction ${message.hash} confirmed`);
      break;

    case JournalMessageType.STATIC_CALL_COMPLETE:
      console.log(`Static call completed for future ${message.futureId}`);
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES:
      console.log(
        `Transaction fee bump for onchain interaction ${message.networkInteractionId} of future ${message.futureId} requested`
      );
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_DROPPED:
      console.log(
        `Transactions for onchain interaction ${message.networkInteractionId} of future ${message.futureId} have been dropped and will be resent`
      );
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER:
      console.log(
        `Transactions for onchain interaction ${message.networkInteractionId} of future ${message.futureId} have been replaced by the user`
      );
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT:
      console.log(
        `Onchain interaction ${message.networkInteractionId} of future ${message.futureId} failed due to being resent too many times and not having confirmed`
      );
      break;
  }
}
