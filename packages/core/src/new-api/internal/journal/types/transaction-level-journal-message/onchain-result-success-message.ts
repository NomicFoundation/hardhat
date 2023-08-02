import { SolidityParameterType } from "../../../../types/module";
import { JournalMessageType } from "../journal";

export type OnchainResultSuccessMessage =
  | OnchainDeployContractSuccessMessage
  | OnchainCallFunctionSuccessMessage
  | OnchainStaticCallSuccessMessage
  | OnchainReadEventArgumentSuccessMessage
  | OnchainSendDataSuccessMessage
  | OnchainContractAtSuccessMessage;

/**
 * A successful deploy contract transaction result.
 *
 * @beta
 */
export interface OnchainDeployContractSuccessMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "deploy-contract-success";
  futureId: string;
  executionId: number;
  contractAddress: string;
  txId: string;
}

/**
 * A successful call function transaction result.
 *
 * @beta
 */
export interface OnchainCallFunctionSuccessMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "call-function-success";
  futureId: string;
  executionId: number;
  txId: string;
}

/**
 * A successful static function call transaction result.
 *
 * @beta
 */
export interface OnchainStaticCallSuccessMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "static-call-success";
  futureId: string;
  executionId: number;
  result: SolidityParameterType;
}

/**
 * A successful read event argument result.
 *
 * @beta
 */
export interface OnchainReadEventArgumentSuccessMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "read-event-arg-success";
  futureId: string;
  executionId: number;
  result: SolidityParameterType;
}

/**
 * A successful send transaction result.
 *
 * @beta
 */
export interface OnchainSendDataSuccessMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "send-data-success";
  futureId: string;
  executionId: number;
  txId: string;
}

/**
 * A successful contract at result.
 *
 * @beta
 */
export interface OnchainContractAtSuccessMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "contract-at-success";
  futureId: string;
  executionId: number;
  contractName: string;
  contractAddress: string;
}
