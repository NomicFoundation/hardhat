import {
  CallFunctionStartMessage,
  ContractAtStartMessage,
  DeployContractStartMessage,
  FutureStartMessage,
  JournalableMessage,
  OnchainCallFunctionSuccessMessage,
  OnchainContractAtSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainReadEventArgumentSuccessMessage,
  OnchainResultFailureMessage,
  OnchainResultMessage,
  OnchainResultSuccessMessage,
  OnchainSendDataSuccessMessage,
  OnchainStaticCallSuccessMessage,
  ReadEventArgumentStartMessage,
  SendDataStartMessage,
  StaticCallStartMessage,
  WipeMessage,
} from "../../types/journal";
import { FutureType } from "../../types/module";

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
    isStaticCallStartMessage(potential)
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
  potential: FutureStartMessage
): potential is ReadEventArgumentStartMessage {
  return potential.futureType === FutureType.READ_EVENT_ARGUMENT;
}

/**
 * Returns true if potential is a send data start message
 *
 * @beta
 */
export function isSendDataStartMessage(
  potential: FutureStartMessage
): potential is SendDataStartMessage {
  return potential.futureType === FutureType.SEND_DATA;
}

/**
 * Returns true if potential is a contract at start message
 *
 * @beta
 */
export function isContractAtStartMessage(
  potential: FutureStartMessage
): potential is ContractAtStartMessage {
  const deploymentTypes = [
    FutureType.NAMED_CONTRACT_AT,
    FutureType.ARTIFACT_CONTRACT_AT,
  ];

  return deploymentTypes.includes(potential.futureType);
}

export function isOnChainResultMessage(
  message: JournalableMessage
): message is OnchainResultMessage {
  return message.type === "onchain-result";
}

export function isOnChainSuccessMessage(
  message: JournalableMessage
): message is OnchainResultSuccessMessage {
  return (
    isOnchainDeployContractSuccessMessage(message) ||
    isOnchainCallFunctionSuccessMessage(message) ||
    isOnchainStaticCallSuccessMessage(message) ||
    isOnchainReadEventArgumentSuccessMessage(message) ||
    isOnchainSendDataSuccessMessage(message) ||
    isOnchainContractAtSuccessMessage(message)
  );
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

export function isWipeMessage(
  potential: JournalableMessage
): potential is WipeMessage {
  return potential.type === "wipe";
}
