import { FutureType } from "../../../../types/module";
import {
  CallFunctionStartMessage,
  ContractAtStartMessage,
  DeployContractStartMessage,
  FutureStartMessage,
  JournalableMessage,
  ReadEventArgumentStartMessage,
  SendDataStartMessage,
  StaticCallStartMessage,
} from "../../types";

/**
 * Returns true if potential is an future start message.
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
    _isTypeFutureStart(potential) &&
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
    _isTypeFutureStart(potential) &&
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
    _isTypeFutureStart(potential) &&
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
    _isTypeFutureStart(potential) &&
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
    _isTypeFutureStart(potential) &&
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
    _isTypeFutureStart(potential) &&
    deploymentTypes.includes(potential.futureType)
  );
}

function _isTypeFutureStart(
  potential: JournalableMessage
): potential is FutureStartMessage {
  return potential.type === "execution-start";
}
