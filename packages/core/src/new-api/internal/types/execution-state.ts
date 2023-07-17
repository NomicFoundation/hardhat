import { TransactionMessage } from "../../types/journal";
import {
  ArgumentType,
  FutureType,
  SolidityParameterType,
} from "../../types/module";

/**
 * This interface represents a transaction that was sent to the network.
 *
 * We keep enough information to track its progress, including detecting if it
 * was dropped or replaced by a different one.
 */
interface Transaction {
  sender: string;
  nonce: number;
  txId: string;
  // TODO: Should we record something else? Maybe to do fewer requests?
}

/**
 * We define the possible onchain interactions that execution strategies can request.
 */
enum OnchainInteractionType {
  DEPLOYMENT,
  FUNCTION_CALL,
  SEND,
}

/**
 * Each onchain interaction is recorded associated to an id, provided by the execution
 * strategy. With the entire ExecutionHistory, using these ids, the strategy must be
 * able to regenerate its internal state and resume an execution.
 *
 * We also associate a sequence of transactions with each onchain interactions. These
 * are the different transactions that Ignition tried to send to execute this onchain
 * interaction. Ideally it should be a single one, but we may need to replace it due
 * to errors or gas price changes, so we store all of them, in order.
 */
interface BaseOnchainInteraction<
  OnchainInteractionTypeT extends OnchainInteractionType
> {
  id: string;
  type: OnchainInteractionTypeT;
  transactions: Transaction[];
}

/**
 * A request to deploy a contract using by sending a transaction to the null address.
 */
interface DeploymentOnchainInteraction
  extends BaseOnchainInteraction<OnchainInteractionType.DEPLOYMENT> {
  deploymentBytecode: string; // Maybe we want to optimize this out of the journal? In some cases it can be read from the artifact.
  constructorArgs: ArgumentType[];
  value: bigint;
}

/**
 * A request to call a function of an existing contract.
 */
interface FunctionCallOnchainInteraction
  extends BaseOnchainInteraction<OnchainInteractionType.FUNCTION_CALL> {
  contractAddress: string;
  signature: string; // TODO: Maybe ABI fragment?
  arguments: ArgumentType[];
  value: bigint;
}

/**
 * A request to send an arbitrary EVM message to an account.
 */
interface SendOnchainInteraction
  extends BaseOnchainInteraction<OnchainInteractionType.SEND> {
  to: string;
  data: string;
  value: bigint;
  transactions: Transaction[];
}

export type OnchainInteraction =
  | DeploymentOnchainInteraction
  | FunctionCallOnchainInteraction
  | SendOnchainInteraction;

/**
 * The execution history of a future is a sequence of onchain interactions.
 */
type ExecutionHistory = TransactionMessage[];

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
  storedArtifactPath: string; // As stored in the deployment directory.
  storedBuildInfoPath?: string; // As stored in the deployment directory. Optional as it's not always present
  contractName: string;
  constructorArgs: ArgumentType[];
  libraries: Record<string, string>; // TODO: Do we need to store their future ids for the reconciliation process?
  value: bigint;
  from: string | undefined;
  contractAddress?: string; // The result
  txId?: string; // also stored after success for use when reading events
}

export interface CallExecutionState
  extends BaseExecutionState<FutureType.NAMED_CONTRACT_CALL> {
  storedArtifactPath: string; // As stored in the deployment directory.
  contractAddress: string;
  functionName: string;
  args: ArgumentType[];
  value: bigint;
  from: string | undefined;
  txId?: string;
}

export interface StaticCallExecutionState
  extends BaseExecutionState<FutureType.NAMED_STATIC_CALL> {
  storedArtifactPath: string; // As stored in the deployment directory.
  contractAddress: string;
  functionName: string;
  args: ArgumentType[];
  from: string | undefined;
  result?: SolidityParameterType;
}

export interface ContractAtExecutionState
  extends BaseExecutionState<
    FutureType.NAMED_CONTRACT_AT | FutureType.ARTIFACT_CONTRACT_AT
  > {
  storedArtifactPath: string; // As stored in the deployment directory.
  contractName: string;
  contractAddress: string;
}

export interface ReadEventArgumentExecutionState
  extends BaseExecutionState<FutureType.READ_EVENT_ARGUMENT> {
  storedArtifactPath: string; // As stored in the deployment directory.
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
