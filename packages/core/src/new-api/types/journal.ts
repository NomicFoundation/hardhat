import { ArgumentType, FutureType } from "./module";

/**
 * Store a deployments execution state as a transaction log.
 *
 * @beta
 */
export interface Journal {
  record(message: JournalableMessage): Promise<void>;

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
export type TransactionMessage = OnchainInteraction | OnchainResult;

// #region "OnchainInteraction"

/**
 * A on-chain interaction request for the transaction service.
 *
 * @beta
 */
export type OnchainInteraction = DeployContractInteraction;

/**
 * A on-chain interaction request to deploy a contract/library.
 *
 * @beta
 */
export interface DeployContractInteraction {
  value: string;
  args: ArgumentType[];
  from: string;
  contractName: string;
  type: "onchain-action";
  subtype: "deploy-contract";
}

// #endregion

// #region "OnchainResult"

/**
 * A journal message indicating a transaction service transaction result.
 *
 * @beta
 */
export type OnchainResult = DeployContractResult;

/**
 * A successful deploy contract transaction result.
 *
 * @beta
 */
export interface DeployContractResult {
  type: "onchain-result";
  subtype: "deploy-contract";
  contractAddress: string;
}

// #endregion

// #endregion

// #region "ExecutionMessage"

/**
 * Journal messages at the future execution level.
 *
 * @beta
 */
export type ExecutionMessage = FutureExecutionUpdate | ExecutionResult;

// #region "FutureExecutionUpdate"

/**
 * Journal messages that update the future level state.
 *
 * @beta
 */
export type FutureExecutionUpdate = FutureStart | FutureRestart;

/**
 * A journal message to initialise the execution state for a future.
 *
 * @beta
 */
export interface FutureStart {
  type: "execution-start";
  futureId: string;
  futureType: FutureType;
  strategy: string;
  dependencies: string[];
  storedArtifactPath: string;
  storedBuildInfoPath: string;
  contractName: string;
  constructorArgs: ArgumentType[];
  libraries: { [key: string]: string };
  value: string;
  from: string;
}

/**
 * A journal message to indicate a future is being restarted.
 *
 * @beta
 */
export interface FutureRestart {
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
export type ExecutionResult =
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
export type ExecutionSuccess = DeployedContractExecutionSuccess;

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
