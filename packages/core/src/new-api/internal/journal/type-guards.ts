import {
  CallFunctionStartMessage,
  DeployContractStartMessage,
  FutureStartMessage,
  StaticCallStartMessage,
} from "../../types/journal";
import { FutureType } from "../../types/module";

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
