import { SolidityParameterType } from "../../../../types/module";
import { JournalMessageType } from "../journal";

/**
 * A on-chain interaction request for the transaction service.
 *
 * @beta
 */
export type OnchainInteractionMessage =
  | DeployContractInteractionMessage
  | CallFunctionInteractionMessage
  | StaticCallInteractionMessage
  | ReadEventArgumentInteractionMessage
  | SendDataInteractionMessage
  | ContractAtInteractionMessage;

/**
 * A on-chain interaction request to deploy a contract/library.
 *
 * @beta
 */
export interface DeployContractInteractionMessage {
  type: JournalMessageType.ONCHAIN_ACTION;
  subtype: "deploy-contract";
  futureId: string;
  executionId: number;
  args: SolidityParameterType[];
  contractName: string;
  artifactFutureId: string;
  value: string;
  libraries: { [key: string]: string };
  from: string;
}

/**
 * A on-chain interaction request to call a function.
 *
 * @beta
 */
export interface CallFunctionInteractionMessage {
  type: JournalMessageType.ONCHAIN_ACTION;
  subtype: "call-function";
  futureId: string;
  executionId: number;
  args: SolidityParameterType[];
  functionName: string;
  value: string;
  contractAddress: string;
  artifactFutureId: string;
  from: string;
}

/**
 * A on-chain interaction request to statically call a function.
 *
 * @beta
 */
export interface StaticCallInteractionMessage {
  type: JournalMessageType.ONCHAIN_ACTION;
  subtype: "static-call";
  futureId: string;
  executionId: number;
  args: SolidityParameterType[];
  functionName: string;
  contractAddress: string;
  artifactFutureId: string;
  from: string;
}

/**
 * A on-chain interaction request to read an event argument.
 *
 * @beta
 */
export interface ReadEventArgumentInteractionMessage {
  type: JournalMessageType.ONCHAIN_ACTION;
  subtype: "read-event-arg";
  futureId: string;
  executionId: number;
  artifactFutureId: string;
  eventName: string;
  argumentName: string;
  txToReadFrom: string;
  emitterAddress: string;
  eventIndex: number;
}

/**
 * A on-chain interaction request to send a generic transaction.
 *
 * @beta
 */
export interface SendDataInteractionMessage {
  type: JournalMessageType.ONCHAIN_ACTION;
  subtype: "send-data";
  futureId: string;
  executionId: number;
  value: string;
  data: string;
  to: string;
  from: string;
}

/**
 * A on-chain interaction request to get a contract at a given address.
 *
 * @beta
 */
export interface ContractAtInteractionMessage {
  type: JournalMessageType.ONCHAIN_ACTION;
  subtype: "contract-at";
  futureId: string;
  executionId: number;
  contractName: string;
  contractAddress: string;
  artifactFutureId: string;
}
