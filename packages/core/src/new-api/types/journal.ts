import { ArgumentType, FutureType } from "./module";

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
export type JournalableMessage = TransactionMessage | ExecutionMessage;

// #region "TransactionMessage"

/**
 * The journal message relating to transaction service state.
 *
 * @beta
 */
export type TransactionMessage =
  | OnchainInteractionMessage
  | OnchainResultMessage;

// #region "OnchainInteraction"

/**
 * A on-chain interaction request for the transaction service.
 *
 * @beta
 */
export type OnchainInteractionMessage =
  | DeployContractInteractionMessage
  | CallFunctionInteractionMessage;

/**
 * A on-chain interaction request to deploy a contract/library.
 *
 * @beta
 */
export interface DeployContractInteractionMessage {
  type: "onchain-action";
  subtype: "deploy-contract";
  futureId: string;
  transactionId: number;
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
  transactionId: number;
  args: ArgumentType[];
  functionName: string;
  value: string;
  contractAddress: string;
  storedArtifactPath: string;
  from: string;
}

// #endregion

// #region "OnchainResult"

/**
 * A journal message indicating a transaction service transaction result.
 *
 * @beta
 */
export type OnchainResultMessage =
  | DeployContractResultMessage
  | CallFunctionResultMessage;

/**
 * A successful deploy contract transaction result.
 *
 * @beta
 */
export interface DeployContractResultMessage {
  type: "onchain-result";
  subtype: "deploy-contract";
  futureId: string;
  transactionId: number;
  contractAddress: string;
}

/**
 * A successful call function transaction result.
 *
 * @beta
 */
export interface CallFunctionResultMessage {
  type: "onchain-result";
  subtype: "call-function";
  futureId: string;
  transactionId: number;
  txId: string;
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
export type ExecutionUpdateMessage = FutureStartMessage | FutureRestartMessage;

/**
 * A journal message to initialise the execution state for a future.
 *
 * @beta
 */
export type FutureStartMessage =
  | DeployContractStartMessage
  | CallFunctionStartMessage;

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
 * A journal message to indicate a future is being restarted.
 *
 * @beta
 */
export interface FutureRestartMessage {
  type: "execution-restart";
  futureId: string;
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
  | CalledFunctionExecutionSuccess;

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

// #endregion

/**
 * A journal message indicating a future failed execution.
 *
 * @beta
 */
export interface ExecutionFailure {
  type: "execution-failure";
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
