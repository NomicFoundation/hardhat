import {
  ArgumentType,
  FutureType,
  SolidityParameterType,
} from "../../types/module";

/**
 * Store a deployments execution state as a transaction log.
 *
 * @beta
 */
export interface Journal {
  record(message: JournalableMessage): void;

  read(): AsyncGenerator<JournalableMessage>;
}

/**
 * A message recordable in the journal's transaction log.
 *
 * @beta
 */
export type JournalableMessage =
  | StartRunMessage
  | TransactionMessage
  | ExecutionMessage
  | WipeMessage;

/**
 * The types of journal messages.
 *
 * @beta
 */
export enum JournalMessageType {
  RUN_START = "run-start",
  EXECUTION_START = "execution-start",
  ONCHAIN_ACTION = "onchain-action",
  ONCHAIN_TRANSACTION_REQUEST = "onchain-transaction-request",
  ONCHAIN_TRANSACTION_ACCEPT = "onchain-transaction-accept",
  ONCHAIN_TRANSACTION_RESET = "onchain-transaction-reset",
  ONCHAIN_RESULT = "onchain-result",
  EXECUTION_SUCCESS = "execution-success",
  EXECUTION_FAILURE = "execution-failure",
  EXECUTION_TIMEOUT = "execution-timeout",
  EXECUTION_HOLD = "execution-hold",
  WIPE = "wipe",
}

// #region "StartRunMessage"

/**
 * A message indicating the start of a new run.
 *
 * @beta
 */
export interface StartRunMessage {
  // TODO: we should add chain id, so we can reconcile on previous chain id
  type: JournalMessageType.RUN_START;
}

// #endregion

// #region "TransactionMessage"

/**
 * The journal message relating to transaction service state.
 *
 * @beta
 */
export type TransactionMessage =
  | OnchainInteractionMessage
  | OnchainTransactionRequest
  | OnchainTransactionAccept
  | OnchainTransactionReset
  | OnchainResultMessage;

// #region "OnchainInteraction"

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
  args: ArgumentType[];
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
  args: ArgumentType[];
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
  args: ArgumentType[];
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

// #endregion

// #region "OnchainTransaction"

/**
 * Records a transaction submission to the chain.
 *
 * @beta
 */
export interface OnchainTransactionRequest {
  type: JournalMessageType.ONCHAIN_TRANSACTION_REQUEST;
  futureId: string;
  executionId: number;
  from: string;
  nonce: number;
  tx: any;
}

/**
 * Records a transaction submission being accepted in the mempool.
 *
 * @beta
 */
export interface OnchainTransactionAccept {
  type: JournalMessageType.ONCHAIN_TRANSACTION_ACCEPT;
  futureId: string;
  executionId: number;
  txHash: string;
}

// #endregion

// #region "OnchainTransactionReset"

/**
 * Records a transaction submission being reset, so it can be resent.
 *
 * @beta
 */
export interface OnchainTransactionReset {
  type: JournalMessageType.ONCHAIN_TRANSACTION_RESET;
  futureId: string;
  executionId: number;
}

// #endregion

// #region "OnchainResult"

/**
 * A journal message indicating a transaction service transaction result.
 *
 * @beta
 */
export type OnchainResultMessage =
  | OnchainResultSuccessMessage
  | OnchainResultFailureMessage;

type OnchainResultSuccessMessage =
  | OnchainDeployContractSuccessMessage
  | OnchainCallFunctionSuccessMessage
  | OnchainStaticCallSuccessMessage
  | OnchainReadEventArgumentSuccessMessage
  | OnchainSendDataSuccessMessage
  | OnchainContractAtSuccessMessage;

export type OnchainResultFailureMessage = OnchainFailureMessage;

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

/**
 * A failed on-chain transaction result.
 *
 * @beta
 */
export interface OnchainFailureMessage {
  type: JournalMessageType.ONCHAIN_RESULT;
  subtype: "failure";
  futureId: string;
  executionId: number;
  error: Error;
}

// #endregion

// #endregion

// #region "ExecutionMessage"

/**
 * Journal messages at the future execution level.
 *
 * @beta
 */
type ExecutionMessage = ExecutionUpdateMessage | ExecutionResultMessage;

// #region "FutureExecutionUpdate"

/**
 * Journal messages that update the future level state.
 *
 * @beta
 */
type ExecutionUpdateMessage = FutureStartMessage;

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
  constructorArgs: ArgumentType[];
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
  args: ArgumentType[];
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
  args: ArgumentType[];
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

// #endregion

// #region "ExecutionResult"

/**
 * A journal message indicating the result of executing a future.
 *
 * @beta
 */
export type ExecutionResultMessage =
  | ExecutionSuccess
  | ExecutionFailure
  | ExecutionTimeout
  | ExecutionHold;

// #region "ExecutionSuccess"

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

// #endregion

/**
 * A journal message indicating a future failed execution.
 *
 * @beta
 */
export interface ExecutionFailure {
  type: JournalMessageType.EXECUTION_FAILURE;
  futureId: string;
  error: Error;
}

/**
 * A journal message indicating a future execution timed out.
 *
 * @beta
 */
export interface ExecutionTimeout {
  type: JournalMessageType.EXECUTION_TIMEOUT;
  futureId: string;
  executionId: number;
  txHash: string;
}

/**
 * A journal message indicating a future's execution was not completed within
 * the timeout.
 *
 * @beta
 */
export interface ExecutionHold {
  type: JournalMessageType.EXECUTION_HOLD;
  futureId: string;
  executionId: number;
}

// #endregion

// #endregion

// #region "WipeMessage"

/**
 * A journal message indicating the user has instructed Ignition to clear
 * the futures state so it can be rerun.
 *
 * @beta
 */
export interface WipeMessage {
  type: JournalMessageType.WIPE;
  futureId: string;
}

// #endregion
