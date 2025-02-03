import type { JournalMessage } from "../../execution/types/messages.js";

import { ExecutionResultType } from "../../execution/types/execution-result.js";
import { JournalMessageType } from "../../execution/types/messages.js";
import { NetworkInteractionType } from "../../execution/types/network-interaction.js";
import { formatSolidityParameter } from "../../formatters.js";

export function logJournalableMessage(message: JournalMessage): void {
  switch (message.type) {
    case JournalMessageType.DEPLOYMENT_INITIALIZE:
      console.log(`Deployment started`);
      break;

    case JournalMessageType.WIPE_APPLY: {
      console.log(
        `Removing the execution of future ${message.futureId} from the journal`,
      );
    }
    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Starting to execute the deployment future ${message.futureId}`,
      );
      break;

    case JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE:
      console.log(`Starting to execute the call future ${message.futureId}`);
      break;

    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Starting to execute the static call future ${message.futureId}`,
      );
      break;

    case JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Started to execute the send data future ${message.futureId}`,
      );
      break;

    case JournalMessageType.STATIC_CALL_EXECUTION_STATE_COMPLETE:
      if (message.result.type === ExecutionResultType.SUCCESS) {
        console.log(
          `Successfully completed the execution of static call future ${
            message.futureId
          } with result ${formatSolidityParameter(message.result.value)}`,
        );
      } else {
        console.log(`Execution of future ${message.futureId} failed`);
      }
      break;

    case JournalMessageType.DEPLOYMENT_EXECUTION_STATE_COMPLETE:
      if (message.result.type === ExecutionResultType.SUCCESS) {
        console.log(
          `Successfully completed the execution of deployment future ${message.futureId} with result ${message.result.address}`,
        );
      } else {
        console.log(`Execution of future ${message.futureId} failed`);
      }
      break;

    case JournalMessageType.CALL_EXECUTION_STATE_COMPLETE:
      if (message.result.type === ExecutionResultType.SUCCESS) {
        console.log(
          `Successfully completed the execution of call future ${message.futureId}`,
        );
      } else {
        console.log(`Execution of future ${message.futureId} failed`);
      }
      break;

    case JournalMessageType.SEND_DATA_EXECUTION_STATE_COMPLETE:
      if (message.result.type === ExecutionResultType.SUCCESS) {
        console.log(
          `Successfully completed the execution of send data future ${message.futureId}`,
        );
      } else {
        console.log(`Execution of future ${message.futureId} failed`);
      }
      break;

    case JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE:
      console.log(`Executed contract at future ${message.futureId}`);
      break;

    case JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Executed read event argument future ${
          message.futureId
        } with result ${formatSolidityParameter(message.result)}`,
      );
      break;

    case JournalMessageType.ENCODE_FUNCTION_CALL_EXECUTION_STATE_INITIALIZE:
      console.log(
        `Executed encode function call future ${message.futureId} with result ${message.result}`,
      );
      break;

    case JournalMessageType.NETWORK_INTERACTION_REQUEST:
      if (
        message.networkInteraction.type ===
        NetworkInteractionType.ONCHAIN_INTERACTION
      ) {
        console.log(
          `New onchain interaction ${message.networkInteraction.id} requested for future ${message.futureId}`,
        );
      } else {
        console.log(
          `New static call ${message.networkInteraction.id} requested for future ${message.futureId}`,
        );
      }
      break;

    case JournalMessageType.TRANSACTION_SEND:
      console.log(
        `Transaction ${message.transaction.hash} sent for onchain interaction ${message.networkInteractionId} of future ${message.futureId}`,
      );
      break;

    case JournalMessageType.TRANSACTION_CONFIRM:
      console.log(`Transaction ${message.hash} confirmed`);
      break;

    case JournalMessageType.STATIC_CALL_COMPLETE:
      console.log(
        `Static call ${message.networkInteractionId} completed for future ${message.futureId}`,
      );
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_BUMP_FEES:
      console.log(
        `A transaction with higher fees will be sent for onchain interaction ${message.networkInteractionId} of future ${message.futureId}`,
      );
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_DROPPED:
      console.log(
        `Transactions for onchain interaction ${message.networkInteractionId} of future ${message.futureId} has been dropped and will be resent`,
      );
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_REPLACED_BY_USER:
      console.log(
        `Transactions for onchain interaction ${message.networkInteractionId} of future ${message.futureId} has been replaced by the user and the onchain interaction exection will start again`,
      );
      break;

    case JournalMessageType.ONCHAIN_INTERACTION_TIMEOUT:
      console.log(
        `Onchain interaction ${message.networkInteractionId} of future ${message.futureId} failed due to being resent too many times and not having confirmed`,
      );
      break;
  }
}
