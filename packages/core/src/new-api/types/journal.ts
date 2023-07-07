import { ArgumentType, FutureType, SolidityParameterType } from "./module";

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
  | TransactionMessage
  | ExecutionMessage
  | WipeMessage;

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
  type: "onchain-action";
  subtype: "deploy-contract";
  futureId: string;
  executionId: number;
  args: ArgumentType[];
  contractName: string;
  storedArtifactPath: string;
  value: string;
  from: string;
}

/**
 * A on-chain interaction request to call a function.
 *
 * @beta
 */
export interface CallFunctionInteractionMessage {
  type: "onchain-action";
  subtype: "call-function";
  futureId: string;
  executionId: number;
  args: ArgumentType[];
  functionName: string;
  value: string;
  contractAddress: string;
  storedArtifactPath: string;
  from: string;
}

/**
 * A on-chain interaction request to statically call a function.
 *
 * @beta
 */
export interface StaticCallInteractionMessage {
  type: "onchain-action";
  subtype: "static-call";
  futureId: string;
  executionId: number;
  args: ArgumentType[];
  functionName: string;
  contractAddress: string;
  storedArtifactPath: string;
  from: string;
}

/**
 * A on-chain interaction request to read an event argument.
 *
 * @beta
 */
export interface ReadEventArgumentInteractionMessage {
  type: "onchain-action";
  subtype: "read-event-arg";
  futureId: string;
  executionId: number;
  storedArtifactPath: string;
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
  type: "onchain-action";
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
  type: "onchain-action";
  subtype: "contract-at";
  futureId: string;
  executionId: number;
  contractName: string;
  contractAddress: string;
  storedArtifactPath: string;
}

// #endregion

// #region "OnchainTransaction"

/**
 * Records a transaction submission to the chain.
 *
 * @beta
 */
export interface OnchainTransactionRequest {
  type: "onchain-transaction-request";
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
  type: "onchain-transaction-accept";
  futureId: string;
  executionId: number;
  txHash: string;
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

export type OnchainResultSuccessMessage =
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
  type: "onchain-result";
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
  type: "onchain-result";
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
  type: "onchain-result";
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
  type: "onchain-result";
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
  type: "onchain-result";
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
  type: "onchain-result";
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
  type: "onchain-result";
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
export type ExecutionMessage = ExecutionUpdateMessage | ExecutionResultMessage;

// #region "FutureExecutionUpdate"

/**
 * Journal messages that update the future level state.
 *
 * @beta
 */
export type ExecutionUpdateMessage = FutureStartMessage;

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
  type: "execution-start";
  futureId: string;
  futureType:
    | FutureType.NAMED_CONTRACT_DEPLOYMENT
    | FutureType.NAMED_LIBRARY_DEPLOYMENT
    | FutureType.ARTIFACT_CONTRACT_DEPLOYMENT
    | FutureType.ARTIFACT_LIBRARY_DEPLOYMENT;
  strategy: string;
  dependencies: string[];
  storedArtifactPath: string;
  storedBuildInfoPath: string | undefined;
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
  type: "execution-start";
  futureId: string;
  futureType: FutureType.NAMED_CONTRACT_CALL;
  strategy: string;
  dependencies: string[];
  args: ArgumentType[];
  functionName: string;
  value: string;
  contractAddress: string;
  from: string | undefined;
  storedArtifactPath: string;
}

/**
 * A journal message to initialise the execution state for a static call.
 *
 * @beta
 */
export interface StaticCallStartMessage {
  type: "execution-start";
  futureId: string;
  futureType: FutureType.NAMED_STATIC_CALL;
  strategy: string;
  dependencies: string[];
  args: ArgumentType[];
  functionName: string;
  contractAddress: string;
  storedArtifactPath: string;
  from: string;
}

/**
 * A journal message to initialise the execution state for reading an event argument.
 *
 * @beta
 */
export interface ReadEventArgumentStartMessage {
  type: "execution-start";
  futureId: string;
  futureType: FutureType.READ_EVENT_ARGUMENT;
  strategy: string;
  dependencies: string[];
  storedArtifactPath: string;
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
  type: "execution-start";
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
  type: "execution-start";
  futureId: string;
  futureType: FutureType.NAMED_CONTRACT_AT | FutureType.ARTIFACT_CONTRACT_AT;
  strategy: string;
  dependencies: string[];
  storedArtifactPath: string;
  storedBuildInfoPath: string | undefined;
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
  | ExecutionHold;

/**
 * The types of execution result.
 *
 * @beta
 */
export type ExecutionResultTypes = [
  "execution-success",
  "execution-failure",
  "execution-hold"
];

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
  type: "execution-success";
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
  type: "execution-success";
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
  type: "execution-success";
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
  type: "execution-success";
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
  type: "execution-success";
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
  type: "execution-success";
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
  type: "execution-failure";
  futureId: string;
  error: Error;
}

/**
 * A journal message indicating a future's execution was not completed within
 * the timeout.
 *
 * @beta
 */
export interface ExecutionHold {
  type: "execution-hold";
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
  type: "wipe";
  futureId: string;
}

// #endregion
