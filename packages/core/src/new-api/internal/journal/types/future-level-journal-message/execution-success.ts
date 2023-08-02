import { SolidityParameterType } from "../../../../types/module";
import { JournalMessageType } from "../journal";

/**
 * A journal message indicating a future executed successfully.
 *
 * @beta
 */
export type ExecutionSuccess =
  | DeployedContractExecutionSuccess
  | CalledFunctionExecutionSuccess
  | StaticCallExecutionSuccess
  | ReadEventArgumentExecutionSuccess
  | SendDataExecutionSuccess
  | ContractAtExecutionSuccess;

/**
 * A journal message indicating a contract/library deployed successfully.
 *
 * @beta
 */
export interface DeployedContractExecutionSuccess {
  type: JournalMessageType.EXECUTION_SUCCESS;
  subtype: "deploy-contract";
  futureId: string;
  contractName: string;
  contractAddress: string;
  txId: string;
}

/**
 * A journal message indicating a contract function was called successfully.
 *
 * @beta
 */
export interface CalledFunctionExecutionSuccess {
  type: JournalMessageType.EXECUTION_SUCCESS;
  subtype: "call-function";
  futureId: string;
  functionName: string;
  txId: string;
  contractAddress: string;
}

/**
 * A journal message indicating a static function was called successfully.
 *
 * @beta
 */
export interface StaticCallExecutionSuccess {
  type: JournalMessageType.EXECUTION_SUCCESS;
  subtype: "static-call";
  futureId: string;
  functionName: string;
  result: SolidityParameterType;
  contractAddress: string;
}

/**
 * A journal message indicating an event argument was read successfully.
 *
 * @beta
 */
export interface ReadEventArgumentExecutionSuccess {
  type: JournalMessageType.EXECUTION_SUCCESS;
  subtype: "read-event-arg";
  futureId: string;
  eventName: string;
  argumentName: string;
  result: SolidityParameterType;
}

/**
 * A journal message indicating a generic transaction was sent successfully.
 *
 * @beta
 */
export interface SendDataExecutionSuccess {
  type: JournalMessageType.EXECUTION_SUCCESS;
  subtype: "send-data";
  futureId: string;
  txId: string;
}

/**
 * A journal message indicating a contract at the given address was wrapped successfully.
 *
 * @beta
 */
export interface ContractAtExecutionSuccess {
  type: JournalMessageType.EXECUTION_SUCCESS;
  subtype: "contract-at";
  futureId: string;
  contractName: string;
  contractAddress: string;
}
