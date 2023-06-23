import {
  CallFunctionStartMessage,
  DeployContractStartMessage,
  FutureStartMessage,
  JournalableMessage,
  OnchainCallFunctionSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainResultFailureMessage,
  OnchainResultMessage,
  OnchainResultSuccessMessage,
  OnchainStaticCallSuccessMessage,
  StaticCallStartMessage,
} from "../../types/journal";
import { FutureType } from "../../types/module";

/**
 * Returns true if potential is ane execution start message.
 *
 * @beta
 */
export function isExecutionStartMessage(
  potential: JournalableMessage
): potential is FutureStartMessage {
  return potential.type === "execution-start";
}

/**
 * Returns true if potential is a contract deployment start message
 *
 * @beta
 */
export function isDeployContractStartMessage(
  potential: FutureStartMessage
): potential is DeployContractStartMessage {
  const deploymentTypes = [
    FutureType.NAMED_CONTRACT_DEPLOYMENT,
    FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
    FutureType.NAMED_LIBRARY_DEPLOYMENT,
    FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
  ];

  return deploymentTypes.includes(potential.futureType);
}

/**
 * Returns true if potential is a call function start message
 *
 * @beta
 */
export function isCallFunctionStartMessage(
  potential: FutureStartMessage
): potential is CallFunctionStartMessage {
  return potential.futureType === FutureType.NAMED_CONTRACT_CALL;
}

/**
 * Returns true if potential is a call function start message
 *
 * @beta
 */
export function isStaticCallStartMessage(
  potential: FutureStartMessage
): potential is StaticCallStartMessage {
  return potential.futureType === FutureType.NAMED_STATIC_CALL;
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
    isOnchainStaticCallSuccessMessage(message)
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
