import { JournalableMessage } from "../../../types/journal";
import {
  isCallFunctionInteraction,
  isCalledFunctionExecutionSuccess,
  isContractAtExecutionSuccess,
  isContractAtInteraction,
  isDeployContractInteraction,
  isDeployedContractExecutionSuccess,
  isExecutionFailure,
  isExecutionHold,
  isReadEventArgumentExecutionSuccess,
  isReadEventArgumentInteraction,
  isSendDataExecutionSuccess,
  isSendDataInteraction,
  isStaticCallExecutionSuccess,
  isStaticCallInteraction,
} from "../../execution/guards";
import {
  isCallFunctionStartMessage,
  isContractAtStartMessage,
  isDeployContractStartMessage,
  isOnChainFailureMessage,
  isOnchainCallFunctionSuccessMessage,
  isOnchainContractAtSuccessMessage,
  isOnchainDeployContractSuccessMessage,
  isOnchainReadEventArgumentSuccessMessage,
  isOnchainSendDataSuccessMessage,
  isOnchainStaticCallSuccessMessage,
  isReadEventArgumentStartMessage,
  isSendDataStartMessage,
  isStaticCallStartMessage,
  isWipeMessage,
} from "../type-guards";

export function logJournalableMessage(message: JournalableMessage): void {
  /* start messages */

  if (isDeployContractStartMessage(message)) {
    return console.log(`deploy contract start - id: '${message.futureId}'`);
  }

  if (isCallFunctionStartMessage(message)) {
    return console.log(`call function start - id: '${message.futureId}'`);
  }

  if (isStaticCallStartMessage(message)) {
    return console.log(`static call start - id: '${message.futureId}'`);
  }

  if (isReadEventArgumentStartMessage(message)) {
    return console.log(`read event argument start - id: '${message.futureId}'`);
  }

  if (isSendDataStartMessage(message)) {
    return console.log(`send data start - id: '${message.futureId}'`);
  }

  if (isContractAtStartMessage(message)) {
    return console.log(`contract at start - id: '${message.futureId}'`);
  }

  /* interaction messages */

  if (isDeployContractInteraction(message)) {
    return console.log(
      `deploy contract interaction - id: '${message.futureId}'`
    );
  }

  if (isCallFunctionInteraction(message)) {
    return console.log(`call function interaction - id: '${message.futureId}'`);
  }

  if (isStaticCallInteraction(message)) {
    return console.log(`static call interaction - id: '${message.futureId}'`);
  }

  if (isReadEventArgumentInteraction(message)) {
    return console.log(
      `read event argument interaction - id: '${message.futureId}'`
    );
  }

  if (isSendDataInteraction(message)) {
    return console.log(`send data interaction - id: '${message.futureId}'`);
  }

  if (isContractAtInteraction(message)) {
    return console.log(`contract at interaction - id: '${message.futureId}'`);
  }

  /* onchain success messages */

  if (isOnchainDeployContractSuccessMessage(message)) {
    return console.log(
      `on-chain deploy contract success - id: '${message.futureId}'`
    );
  }

  if (isOnchainCallFunctionSuccessMessage(message)) {
    return console.log(
      `on-chain call function success - id: '${message.futureId}'`
    );
  }

  if (isOnchainStaticCallSuccessMessage(message)) {
    return console.log(
      `on-chain static call success - id: '${message.futureId}'`
    );
  }

  if (isOnchainReadEventArgumentSuccessMessage(message)) {
    return console.log(
      `on-chain read event argument success - id: '${message.futureId}'`
    );
  }

  if (isOnchainSendDataSuccessMessage(message)) {
    return console.log(
      `on-chain send data success - id: '${message.futureId}'`
    );
  }

  if (isOnchainContractAtSuccessMessage(message)) {
    return console.log(
      `on-chain contract at success - id: '${message.futureId}'`
    );
  }

  /* execution success messages */

  if (isDeployedContractExecutionSuccess(message)) {
    return console.log(
      `deploy contract execution success - id: '${message.futureId}'`
    );
  }

  if (isCalledFunctionExecutionSuccess(message)) {
    return console.log(
      `call function execution success - id: '${message.futureId}'`
    );
  }

  if (isStaticCallExecutionSuccess(message)) {
    return console.log(
      `static call execution success - id: '${message.futureId}'`
    );
  }

  if (isReadEventArgumentExecutionSuccess(message)) {
    return console.log(
      `read event argument execution success - id: '${message.futureId}'`
    );
  }

  if (isSendDataExecutionSuccess(message)) {
    return console.log(
      `send data execution success - id: '${message.futureId}'`
    );
  }

  if (isContractAtExecutionSuccess(message)) {
    return console.log(
      `contract at execution success - id: '${message.futureId}'`
    );
  }

  /* hold & failure messages */

  if (isExecutionHold(message)) {
    return console.log(`Execution on hold`);
  }

  if (isOnChainFailureMessage(message)) {
    return console.log(
      `on chain failure - futureId: '${message.futureId}' error: '${message.error.message}'`
    );
  }

  if (isExecutionFailure(message)) {
    return console.log(
      `execution failure - futureId: '${message.futureId}' error: '${message.error.message}'`
    );
  }

  if (isWipeMessage(message)) {
    return console.log(`wiping journal`);
  }

  throw new Error("Unknown journal message");
}
