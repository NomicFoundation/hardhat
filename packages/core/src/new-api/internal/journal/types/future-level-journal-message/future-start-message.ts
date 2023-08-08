import { FutureType, SolidityParameterType } from "../../../../types/module";
import { JournalMessageType } from "../journal";

/**
 * A journal message to initialise the execution state for a future.
 *
 * @beta
 */
export type FutureStartMessage =
  | DeployContractStartMessage
  | CallFunctionStartMessage
  | StaticCallStartMessage
  | ReadEventArgumentStartMessage
  | SendDataStartMessage
  | ContractAtStartMessage;

/**
 * A journal message to initialise the execution state for a contract deployment.
 *
 * @beta
 */
export interface DeployContractStartMessage {
  type: JournalMessageType.EXECUTION_START;
  futureId: string;
  futureType:
    | FutureType.NAMED_CONTRACT_DEPLOYMENT
    | FutureType.NAMED_LIBRARY_DEPLOYMENT
    | FutureType.ARTIFACT_CONTRACT_DEPLOYMENT
    | FutureType.ARTIFACT_LIBRARY_DEPLOYMENT;
  strategy: string;
  dependencies: string[];
  artifactFutureId: string;
  contractName: string;
  constructorArgs: SolidityParameterType[];
  libraries: { [key: string]: string };
  value: string;
  from: string | undefined;
}

/**
 * A journal message to initialise the execution state for a function call.
 *
 * @beta
 */
export interface CallFunctionStartMessage {
  type: JournalMessageType.EXECUTION_START;
  futureId: string;
  futureType: FutureType.NAMED_CONTRACT_CALL;
  strategy: string;
  dependencies: string[];
  args: SolidityParameterType[];
  functionName: string;
  value: string;
  contractAddress: string;
  from: string | undefined;
  artifactFutureId: string;
}

/**
 * A journal message to initialise the execution state for a static call.
 *
 * @beta
 */
export interface StaticCallStartMessage {
  type: JournalMessageType.EXECUTION_START;
  futureId: string;
  futureType: FutureType.NAMED_STATIC_CALL;
  strategy: string;
  dependencies: string[];
  args: SolidityParameterType[];
  functionName: string;
  contractAddress: string;
  artifactFutureId: string;
  from: string;
}

/**
 * A journal message to initialise the execution state for reading an event argument.
 *
 * @beta
 */
export interface ReadEventArgumentStartMessage {
  type: JournalMessageType.EXECUTION_START;
  futureId: string;
  futureType: FutureType.READ_EVENT_ARGUMENT;
  strategy: string;
  dependencies: string[];
  artifactFutureId: string;
  eventName: string;
  argumentName: string;
  txToReadFrom: string;
  emitterAddress: string;
  eventIndex: number;
}

/**
 * A journal message to initialise the execution state for a generic send.
 *
 * @beta
 */
export interface SendDataStartMessage {
  type: JournalMessageType.EXECUTION_START;
  futureId: string;
  futureType: FutureType.SEND_DATA;
  strategy: string;
  dependencies: string[];
  value: string;
  data: string;
  to: string;
  from: string;
}

/**
 * A journal message to initialise the execution state for a contract at.
 *
 * @beta
 */
export interface ContractAtStartMessage {
  type: JournalMessageType.EXECUTION_START;
  futureId: string;
  futureType: FutureType.NAMED_CONTRACT_AT | FutureType.ARTIFACT_CONTRACT_AT;
  strategy: string;
  dependencies: string[];
  artifactFutureId: string;
  contractName: string;
  contractAddress: string;
}
