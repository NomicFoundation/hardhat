import { FutureType } from "../../types/module";

import {
  CallFunctionInteractionMessage,
  CallFunctionStartMessage,
  CalledFunctionExecutionSuccess,
  ContractAtExecutionSuccess,
  ContractAtInteractionMessage,
  ContractAtStartMessage,
  DeployContractInteractionMessage,
  DeployContractStartMessage,
  DeployedContractExecutionSuccess,
  ExecutionFailure,
  ExecutionHold,
  ExecutionResultMessage,
  ExecutionSuccess,
  ExecutionTimeout,
  FutureStartMessage,
  JournalableMessage,
  OnchainCallFunctionSuccessMessage,
  OnchainContractAtSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainFailureMessage,
  OnchainInteractionMessage,
  OnchainReadEventArgumentSuccessMessage,
  OnchainResultFailureMessage,
  OnchainResultMessage,
  OnchainSendDataSuccessMessage,
  OnchainStaticCallSuccessMessage,
  OnchainTransactionAccept,
  OnchainTransactionRequest,
  OnchainTransactionReset,
  ReadEventArgumentExecutionSuccess,
  ReadEventArgumentInteractionMessage,
  ReadEventArgumentStartMessage,
  SendDataExecutionSuccess,
  SendDataInteractionMessage,
  SendDataStartMessage,
  StartRunMessage,
  StaticCallExecutionSuccess,
  StaticCallInteractionMessage,
  StaticCallStartMessage,
  TransactionMessage,
  WipeMessage,
} from "./types";

/**
 * Determines if potential is a StartRunMessage.
 *
 * @beta
 */
export function isStartRunMessage(
  potential: JournalableMessage
): potential is StartRunMessage {
  return potential.type === "run-start";
}

/**
 * Determines if potential is a Wipe message
 */
export function isWipeMessage(
  potential: JournalableMessage
): potential is WipeMessage {
  return potential.type === "wipe";
}

/**
 * Returns true if potential is ane execution start message.
 *
 * @beta
 */
export function isFutureStartMessage(
  potential: JournalableMessage
): potential is FutureStartMessage {
  return (
    isDeployContractStartMessage(potential) ||
    isCallFunctionStartMessage(potential) ||
    isStaticCallStartMessage(potential) ||
    isReadEventArgumentStartMessage(potential) ||
    isSendDataStartMessage(potential) ||
    isContractAtStartMessage(potential)
  );
}

/**
 * Returns true if potential is a contract deployment start message
 *
 * @beta
 */
export function isDeployContractStartMessage(
  potential: JournalableMessage
): potential is DeployContractStartMessage {
  const deploymentTypes = [
    FutureType.NAMED_CONTRACT_DEPLOYMENT,
    FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.NAMED_LIBRARY_DEPLOYMENT,
    FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
  ];

  return (
    potential.type === "execution-start" &&
    deploymentTypes.includes(potential.futureType)
  );
}

/**
 * Returns true if potential is a call function start message
 *
 * @beta
 */
export function isCallFunctionStartMessage(
  potential: JournalableMessage
): potential is CallFunctionStartMessage {
  return (
    potential.type === "execution-start" &&
    potential.futureType === FutureType.NAMED_CONTRACT_CALL
  );
}

/**
 * Returns true if potential is a call static function start message
 *
 * @beta
 */
export function isStaticCallStartMessage(
  potential: JournalableMessage
): potential is StaticCallStartMessage {
  return (
    potential.type === "execution-start" &&
    potential.futureType === FutureType.NAMED_STATIC_CALL
  );
}

/**
 * Returns true if potential is a read event argument start message
 *
 * @beta
 */
export function isReadEventArgumentStartMessage(
  potential: JournalableMessage
): potential is ReadEventArgumentStartMessage {
  return (
    potential.type === "execution-start" &&
    potential.futureType === FutureType.READ_EVENT_ARGUMENT
  );
}

/**
 * Returns true if potential is a send data start message
 *
 * @beta
 */
export function isSendDataStartMessage(
  potential: JournalableMessage
): potential is SendDataStartMessage {
  return (
    potential.type === "execution-start" &&
    potential.futureType === FutureType.SEND_DATA
  );
}

/**
 * Returns true if potential is a contract at start message
 *
 * @beta
 */
export function isContractAtStartMessage(
  potential: JournalableMessage
): potential is ContractAtStartMessage {
  const deploymentTypes = [
    FutureType.NAMED_CONTRACT_AT,
    FutureType.ARTIFACT_CONTRACT_AT,
  ];

  return (
    potential.type === "execution-start" &&
    deploymentTypes.includes(potential.futureType)
  );
}

export function isTransactionMessage(
  message: JournalableMessage
): message is TransactionMessage {
  return (
    isOnchainInteractionMessage(message) ||
    isOnchainTransactionRequest(message) ||
    isOnchainTransactionAccept(message) ||
    isOnchainTransactionReset(message) ||
    isOnChainResultMessage(message)
  );
}

export function isOnchainTransactionRequest(
  message: JournalableMessage
): message is OnchainTransactionRequest {
  return message.type === "onchain-transaction-request";
}

export function isOnchainTransactionAccept(
  message: JournalableMessage
): message is OnchainTransactionAccept {
  return message.type === "onchain-transaction-accept";
}

export function isOnchainTransactionReset(
  message: JournalableMessage
): message is OnchainTransactionReset {
  return message.type === "onchain-transaction-reset";
}

export function isOnChainResultMessage(
  message: JournalableMessage
): message is OnchainResultMessage {
  return message.type === "onchain-result";
}

export function isOnChainFailureMessage(
  message: JournalableMessage
): message is OnchainResultFailureMessage {
  return isOnChainResultMessage(message) && message.subtype === "failure";
}

export function isOnchainDeployContractSuccessMessage(
  message: JournalableMessage
): message is OnchainDeployContractSuccessMessage {
  return (
    isOnChainResultMessage(message) &&
    message.subtype === "deploy-contract-success"
  );
}

export function isOnchainCallFunctionSuccessMessage(
  message: JournalableMessage
): message is OnchainCallFunctionSuccessMessage {
  return (
    isOnChainResultMessage(message) &&
    message.subtype === "call-function-success"
  );
}

export function isOnchainStaticCallSuccessMessage(
  message: JournalableMessage
): message is OnchainStaticCallSuccessMessage {
  return (
    isOnChainResultMessage(message) && message.subtype === "static-call-success"
  );
}

export function isOnchainReadEventArgumentSuccessMessage(
  message: JournalableMessage
): message is OnchainReadEventArgumentSuccessMessage {
  return (
    isOnChainResultMessage(message) &&
    message.subtype === "read-event-arg-success"
  );
}

export function isOnchainSendDataSuccessMessage(
  message: JournalableMessage
): message is OnchainSendDataSuccessMessage {
  return (
    isOnChainResultMessage(message) && message.subtype === "send-data-success"
  );
}

export function isOnchainContractAtSuccessMessage(
  message: JournalableMessage
): message is OnchainContractAtSuccessMessage {
  return (
    isOnChainResultMessage(message) && message.subtype === "contract-at-success"
  );
}

export function isOnchainFailureMessage(
  message: JournalableMessage
): message is OnchainFailureMessage {
  return isOnChainResultMessage(message) && message.subtype === "failure";
}

export function isExecutionResultMessage(
  potential: JournalableMessage
): potential is ExecutionResultMessage {
  return (
    isExecutionSuccess(potential) ||
    isExecutionTimeout(potential) ||
    isExecutionFailure(potential) ||
    isExecutionHold(potential)
  );
}

export function isExecutionSuccess(
  potential: JournalableMessage
): potential is ExecutionSuccess {
  return potential.type === "execution-success";
}

export function isExecutionFailure(
  potential: JournalableMessage
): potential is ExecutionFailure {
  return potential.type === "execution-failure";
}

export function isExecutionTimeout(
  potential: JournalableMessage
): potential is ExecutionTimeout {
  return potential.type === "execution-timeout";
}

export function isExecutionHold(
  potential: JournalableMessage
): potential is ExecutionHold {
  return potential.type === "execution-hold";
}

function isOnChainAction(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return potential.type === "onchain-action";
}

export function isOnchainInteractionMessage(
  potential: JournalableMessage
): potential is OnchainInteractionMessage {
  return (
    isDeployContractInteraction(potential) ||
    isCallFunctionInteraction(potential) ||
    isStaticCallInteraction(potential) ||
    isReadEventArgumentInteraction(potential) ||
    isSendDataInteraction(potential) ||
    isContractAtInteraction(potential)
  );
}

export function isDeployContractInteraction(
  potential: JournalableMessage
): potential is DeployContractInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "deploy-contract";
}

export function isCallFunctionInteraction(
  potential: JournalableMessage
): potential is CallFunctionInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "call-function";
}

export function isStaticCallInteraction(
  potential: JournalableMessage
): potential is StaticCallInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "static-call";
}

export function isReadEventArgumentInteraction(
  potential: JournalableMessage
): potential is ReadEventArgumentInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "read-event-arg";
}

export function isSendDataInteraction(
  potential: JournalableMessage
): potential is SendDataInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "send-data";
}

export function isContractAtInteraction(
  potential: JournalableMessage
): potential is ContractAtInteractionMessage {
  return isOnChainAction(potential) && potential.subtype === "contract-at";
}

export function isDeployedContractExecutionSuccess(
  potential: JournalableMessage
): potential is DeployedContractExecutionSuccess {
  return (
    isExecutionSuccess(potential) && potential.subtype === "deploy-contract"
  );
}

export function isCalledFunctionExecutionSuccess(
  potential: JournalableMessage
): potential is CalledFunctionExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "call-function";
}

export function isStaticCallExecutionSuccess(
  potential: JournalableMessage
): potential is StaticCallExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "static-call";
}

export function isReadEventArgumentExecutionSuccess(
  potential: JournalableMessage
): potential is ReadEventArgumentExecutionSuccess {
  return (
    isExecutionSuccess(potential) && potential.subtype === "read-event-arg"
  );
}

export function isSendDataExecutionSuccess(
  potential: JournalableMessage
): potential is SendDataExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "send-data";
}

export function isContractAtExecutionSuccess(
  potential: JournalableMessage
): potential is ContractAtExecutionSuccess {
  return isExecutionSuccess(potential) && potential.subtype === "contract-at";
}
