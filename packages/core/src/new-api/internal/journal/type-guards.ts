import { FutureType } from "../../types/module";
import { isOnchainInteractionMessage } from "../execution/guards";

import {
  CallFunctionStartMessage,
  ContractAtStartMessage,
  DeployContractStartMessage,
  FutureStartMessage,
  JournalableMessage,
  OnchainCallFunctionSuccessMessage,
  OnchainContractAtSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainFailureMessage,
  OnchainReadEventArgumentSuccessMessage,
  OnchainResultFailureMessage,
  OnchainResultMessage,
  OnchainSendDataSuccessMessage,
  OnchainStaticCallSuccessMessage,
  OnchainTransactionAccept,
  OnchainTransactionRequest,
  OnchainTransactionReset,
  ReadEventArgumentStartMessage,
  SendDataStartMessage,
  StartRunMessage,
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
