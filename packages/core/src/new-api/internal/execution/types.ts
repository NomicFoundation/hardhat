import {
  TransactionReceipt,
  TransactionRequest,
  TransactionResponse,
} from "ethers";

import { ArtifactResolver } from "../../types/artifact";
import { DeployConfig, DeploymentParameters } from "../../types/deployer";
import {
  FutureType,
  IgnitionModule,
  IgnitionModuleResult,
  SolidityParameterType,
} from "../../types/module";
import { DeploymentLoader } from "../deployment-loader/types";
import {
  ExecutionSuccess,
  OnchainInteractionMessage,
  OnchainResultMessage,
  TransactionLevelJournalMessage,
} from "../journal/types";

/**
 * The execution history of a future is a sequence of onchain interactions.
 */
type ExecutionHistory = TransactionLevelJournalMessage[];

/**
 * The different status that the execution can be at.
 *
 * NOTE: This should probably be state instead of status, right? I'm repeating names. Maybe there's some simplification that can be made.
 */
export enum ExecutionStatus {
  STARTED,
  HOLD,
  TIMEOUT,
  SUCCESS,
  FAILED,
}

/**
 * Each execution state has an id, which must be the same of the future that lead to its creation.
 */
interface BaseExecutionState<FutureTypeT extends FutureType> {
  id: string;
  futureType: FutureTypeT;
  strategy: string; // For example, "basic" | "create2". This needs to be string if we want custom ones.
  status: ExecutionStatus;
  dependencies: Set<string>; // The ids of the futures it depended on
  history: ExecutionHistory;
  onchain: OnchainState;
  // TODO: We need a message in case of failure or hold? Do we need to store them?
}

/**
 * Each deployment execution state is created when the a deployment future gets to be executed. By that
 * time every required value should be concrete, and we can record them.
 */
export interface DeploymentExecutionState
  extends BaseExecutionState<
    | FutureType.NAMED_CONTRACT_DEPLOYMENT
    | FutureType.ARTIFACT_CONTRACT_DEPLOYMENT
    | FutureType.NAMED_LIBRARY_DEPLOYMENT
    | FutureType.ARTIFACT_LIBRARY_DEPLOYMENT
  > {
  artifactFutureId: string; // As stored in the deployment directory.
  contractName: string;
  constructorArgs: SolidityParameterType[];
  libraries: Record<string, string>; // TODO: Do we need to store their future ids for the reconciliation process?
  value: bigint;
  from: string | undefined;
  contractAddress?: string; // The result
  txId?: string; // also stored after success for use when reading events
}

export interface CallExecutionState
  extends BaseExecutionState<FutureType.NAMED_CONTRACT_CALL> {
  artifactFutureId: string;
  contractAddress: string;
  functionName: string;
  args: SolidityParameterType[];
  value: bigint;
  from: string | undefined;
  txId?: string;
}

export interface StaticCallExecutionState
  extends BaseExecutionState<FutureType.NAMED_STATIC_CALL> {
  artifactFutureId: string;
  contractAddress: string;
  functionName: string;
  args: SolidityParameterType[];
  from: string | undefined;
  result?: SolidityParameterType;
}

export interface ContractAtExecutionState
  extends BaseExecutionState<
    FutureType.NAMED_CONTRACT_AT | FutureType.ARTIFACT_CONTRACT_AT
  > {
  artifactFutureId: string;
  contractName: string;
  contractAddress: string;
}

export interface ReadEventArgumentExecutionState
  extends BaseExecutionState<FutureType.READ_EVENT_ARGUMENT> {
  artifactFutureId: string;
  eventName: string;
  argumentName: string;
  txToReadFrom: string;
  emitterAddress: string;
  eventIndex: number;
  result?: SolidityParameterType;
}

export interface SendDataExecutionState
  extends BaseExecutionState<FutureType.SEND_DATA> {
  to: string;
  data: string;
  value: bigint;
  from: string | undefined;
  txId?: string;
}

export type ExecutionState =
  | DeploymentExecutionState
  | CallExecutionState
  | StaticCallExecutionState
  | ContractAtExecutionState
  | ReadEventArgumentExecutionState
  | SendDataExecutionState;

export interface ExecutionStateMap {
  [key: string]: ExecutionState;
}

export enum OnchainStatuses {
  EXECUTE = "EXECUTE",

  DEPLOY_CONTRACT_START = "DEPLOY_CONTRACT_START",
  DEPLOY_CONTRACT_TRANSACTION_REQUEST = "DEPLOY_CONTRACT_TRANSACTION_REQUEST",
  DEPLOY_CONTRACT_TRANSACTION_ACCEPT = "DEPLOY_CONTRACT_TRANSACTION_ACCEPT",

  CALL_FUNCTION_START = "CALL_FUNCTION_START",
  CALL_FUNCTION_TRANSACTION_REQUEST = "CALL_FUNCTION_TRANSACTION_REQUEST",
  CALL_FUNCTION_TRANSACTION_ACCEPT = "CALL_FUNCTION_TRANSACTION_ACCEPT",

  SEND_DATA_START = "SEND_DATA_START",
  SEND_DATA_TRANSACTION_REQUEST = "SEND_DATA_TRANSACTION_REQUEST",
  SEND_DATA_TRANSACTION_ACCEPT = "SEND_DATA_TRANSACTION_ACCEPT",

  CONTRACT_AT_START = "CONTRACT_AT_START",

  STATIC_CALL_START = "STATIC_CALL_START",

  READ_EVENT_ARG_START = "READ_EVENT_ARG_START",
}

export interface OnchainState {
  status:
    | OnchainStatuses.EXECUTE
    | OnchainStatuses.DEPLOY_CONTRACT_START
    | OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_REQUEST
    | OnchainStatuses.DEPLOY_CONTRACT_TRANSACTION_ACCEPT
    | OnchainStatuses.CALL_FUNCTION_START
    | OnchainStatuses.CALL_FUNCTION_TRANSACTION_REQUEST
    | OnchainStatuses.CALL_FUNCTION_TRANSACTION_ACCEPT
    | OnchainStatuses.SEND_DATA_START
    | OnchainStatuses.SEND_DATA_TRANSACTION_REQUEST
    | OnchainStatuses.SEND_DATA_TRANSACTION_ACCEPT
    | OnchainStatuses.CONTRACT_AT_START
    | OnchainStatuses.STATIC_CALL_START
    | OnchainStatuses.READ_EVENT_ARG_START;
  currentExecution: number | null;
  actions: {
    [key: number]:
      | {
          start: {};
          request: {} | null;
          txHash: {} | null;
          receipt: {} | null;
        }
      | {
          result: {} | null;
        }
      | { contractAt: {} | null };
  };
  from: string | null;
  nonce: number | null;
  txHash: string | null;
}

export interface ChainDispatcher {
  getPendingTransactionCount(address: string): Promise<number>;

  getLatestTransactionCount(address: string): Promise<number>;

  getCurrentBlock(): Promise<{ number: number; hash: string }>;

  allocateNextNonceForAccount(address: string): Promise<number>;

  constructDeployTransaction(
    byteCode: string,
    abi: any[],
    args: SolidityParameterType[],
    value: bigint,
    from: string
  ): Promise<TransactionRequest>;

  constructCallTransaction(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: SolidityParameterType[],
    value: bigint,
    from: string
  ): Promise<TransactionRequest>;

  sendTx(tx: TransactionRequest, from: string): Promise<string>;

  staticCallQuery(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: SolidityParameterType[],
    from: string
  ): Promise<SolidityParameterType>;

  getTransaction(
    txHash: string
  ): Promise<TransactionResponse | null | undefined>;

  getTransactionReceipt(
    txHash: string
  ): Promise<TransactionReceipt | null | undefined>;

  getEventArgument(
    eventName: string,
    argumentName: string,
    txToReadFrom: string,
    eventIndex: number,
    emitterAddress: string,
    abi: any[]
  ): Promise<SolidityParameterType>;
}

export interface ExecutionEngineState {
  block: {
    number: number;
    hash: string;
  };
  config: DeployConfig;
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
  accounts: string[];
  deploymentParameters: DeploymentParameters;
  strategy: ExecutionStrategy;
  artifactResolver: ArtifactResolver;
  deploymentLoader: DeploymentLoader;
  chainDispatcher: ChainDispatcher;
  transactionLookupTimer: TransactionLookupTimer;
}

export interface ExecutionStrategyContext {
  executionState: ExecutionState;
  sender?: string;
}

export interface ExecutionStrategy {
  executeStrategy: ({
    executionState,
    sender,
  }: ExecutionStrategyContext) => AsyncGenerator<
    OnchainInteractionMessage,
    OnchainInteractionMessage | ExecutionSuccess,
    OnchainResultMessage | null
  >;
}

export interface TransactionLookup {
  futureId: string;
  executionId: number;
  txHash: string;
}

export interface TransactionLookupTimer {
  /**
   * Register the start time of a transaction lookup.
   *
   * The registration is idempotent.
   *
   * @param txHash - the transaction hash being looked up.
   */
  registerStartTimeIfNeeded(transactionLookup: TransactionLookup): void;

  /**
   * Based on the registered start time of the transaction lookup, determine
   * whether it has timed out.
   *
   * @param txHash  - the transaction hash being looked up.
   * @result whether the transaction lookup has timed out.
   */
  isTimedOut(txHash: string): boolean;

  /**
   * Get all the currently timed out transactions.
   *
   * @result the currently timed out transactions.
   */
  getTimedOutTransactions(): TransactionLookup[];
}
