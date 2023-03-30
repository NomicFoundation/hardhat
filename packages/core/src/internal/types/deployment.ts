import type { ModuleDict, ModuleParams } from "../../types/module";
import type { SerializedDeploymentResult } from "../../types/serialization";
import type {
  ExecutionVertex,
  ExecutionVertexVisitResult,
  VertexVisitResultSuccessResult,
} from "./executionGraph";
import type {
  IGraph,
  VertexDescriptor,
  VertexVisitResultFailure,
  VertexVisitResultSuccess,
} from "./graph";
import type { Services } from "./services";

import { BigNumber } from "ethers";

import { Artifact } from "../../types/hardhat";

/**
 * An UI update function that will be invoked on each internal change with the
 * latest version of the state.
 *
 * @internal
 */
export type UpdateUiAction = (deployState: DeployState) => void;
export type UiParamsClosure = (moduleParams?: ModuleParams) => UpdateUiAction;

/**
 * The possible deployment states.
 *
 * @internal
 */
export enum DeploymentResultState {
  SUCCESS = "success",
  FAILURE = "failure",
  HOLD = "hold",
}

/**
 * The outcome of a deployment run. A deployment can either:
 * - `success` with a set of deployed contract information as the result
 * - `failure` with a list of errors
 * - `hold` indicating that the deployment is part way through but either
 *   blocked or timed out.
 *
 * @internal
 */
export type DeploymentResult<T extends ModuleDict = ModuleDict> =
  | { _kind: DeploymentResultState.FAILURE; failures: [string, Error[]] }
  | { _kind: DeploymentResultState.HOLD; holds: VertexDescriptor[] }
  | {
      _kind: DeploymentResultState.SUCCESS;
      result: SerializedDeploymentResult<T>;
    };

/**
 * The different phases a deployment will move through:
 *
 * uninitialized -\> validating -\> execution -\> complete
 *                      |             |--------\> hold
 *                      |             |--------\> failed
 *                      |
 *                      |----------------------\> validation-failed
 *                      |----------------------\> reconciliation-failed
 *
 * @internal
 */
export type DeployPhase =
  | "uninitialized"
  | "validating"
  | "execution"
  | "complete"
  | "failed"
  | "hold"
  | "validation-failed"
  | "reconciliation-failed"
  | "failed-unexpectedly";

/**
 * Commands for updating Ignitions execution state; external interactions
 * with the blockchain are integrated into the Ignition execution state
 * through these commands.
 *
 * @internal
 */
export type DeployStateExecutionCommand =
  | {
      type: "EXECUTION::START";
      executionGraphHash: string;
    }
  | {
      type: "EXECUTION::SET_BATCH";
      batch: number[];
    }
  | {
      type: "EXECUTION::SET_VERTEX_RESULT";
      vertexId: number;
      result: ExecutionVertexVisitResult;
    };

export type DeployStateCommand =
  | { type: "SET_DETAILS"; config: Partial<DeployNetworkConfig> }
  | { type: "SET_CHAIN_ID"; chainId: number }
  | { type: "SET_NETWORK_NAME"; networkName: string }
  | { type: "SET_ACCOUNTS"; accounts: string[] }
  | { type: "SET_FORCE_FLAG"; force: boolean }
  | {
      type: "START_VALIDATION";
    }
  | {
      type: "VALIDATION_FAIL";
      errors: Error[];
    }
  | {
      type: "TRANSFORM_COMPLETE";
      executionGraph: IGraph<ExecutionVertex>;
    }
  | {
      type: "RECONCILIATION_FAILED";
    }
  | {
      type: "UNEXPECTED_FAIL";
      errors: Error[];
    }
  | DeployStateExecutionCommand;

/**
 * The subsection of the deployment state used during the validation phase
 * of a deployment, where the user's given Module is analysed for potential
 * problems.
 *
 * @internal
 */
export interface ValidationState {
  errors: Error[];
}

/**
 * The vertex has not yet been executed for this deployment run.
 *
 * @internal
 */
export type VertexExecutionStatusUnstarted = "UNSTARTED";

/**
 * The vertex is currently being executed, but the result has come back yet.
 *
 * @internal
 */
export type VertexExecutionStatusRunning = "RUNNING";

/**
 * The action the vertex represented has completed successfully.
 *
 * @internal
 */
export type VertexExecutionStatusCompleted = "COMPLETED";

/**
 * The action the vertex represented has failed with an error.
 *
 * @internal
 */
export type VertexExecutionStatusFailed = "FAILED";

/**
 * The action the vertex represented either timed out or its condition
 * has not been met withint the time out.
 *
 * @internal
 */
export type VertexExecutionStatusHold = "HOLD";

export type VertexExecutionStatus =
  | VertexExecutionStatusUnstarted
  | VertexExecutionStatusRunning
  | VertexExecutionStatusCompleted
  | VertexExecutionStatusFailed
  | VertexExecutionStatusHold;

/**
 * The state associated with a currently running vertex execution.
 *
 * @internal
 */
export interface VertexExecutionStateRunning {
  status: VertexExecutionStatusUnstarted;
  result: undefined;
}

/**
 * The state associated with an unstarted vertex execution.
 *
 * @internal
 */
export interface VertexExecutionStateUnstarted {
  status: VertexExecutionStatusRunning;
  result: undefined;
}

/**
 * The state associated with a successfully completed execution of a vertex.
 *
 * @internal
 */
export interface VertexExecutionStateCompleted {
  status: VertexExecutionStatusCompleted;
  result: VertexVisitResultSuccess<VertexVisitResultSuccessResult>;
}

/**
 * The state associated with a failed execution of a vertex.
 *
 * @internal
 */
export interface VertexExecutionStateFailed {
  status: VertexExecutionStatusFailed;
  result: VertexVisitResultFailure;
}

/**
 * The state associated with a held execution of a vertex, either
 * due to a time out or a condition not met.
 *
 * @internal
 */
export interface VertexExecutionStateHold {
  status: VertexExecutionStatusHold;
  result: undefined;
}

/**
 * The states a vertex can go through during execution.
 *
 * @internal
 */
export type VertexExecutionState =
  | VertexExecutionStateUnstarted
  | VertexExecutionStateRunning
  | VertexExecutionStateCompleted
  | VertexExecutionStateFailed
  | VertexExecutionStateHold;

/**
 * The part of the deployment state used during the execution phase where
 * the dependency graph of on-chain actions are batched then executed with
 * their results recorded.
 *
 * @internal
 */
export interface ExecutionState {
  run: number;
  vertexes: { [key: number]: VertexExecutionState };
  batch: Set<number> | null;
  previousBatches: Array<Set<number>>;
  executionGraphHash: string;
}

/**
 * The key details and configuration used to interact with or understand
 * the Ethereum chain being interacted with.
 *
 * @internal
 */
export interface DeployNetworkConfig {
  moduleName: string;
  chainId: number;
  networkName: string;
  accounts: string[];
  artifacts: Artifact[];
  force: boolean;
}

/**
 * The core state of an Ignition deploy. Ignitions control flow is based on
 * this state, and updates to it are controlled through update commands.
 *
 * @internal
 */
export interface DeployState {
  phase: DeployPhase;
  details: DeployNetworkConfig;
  validation: ValidationState;
  transform: {
    executionGraph: IGraph<ExecutionVertex> | null;
  };
  execution: ExecutionState;
  unexpected: {
    errors: Error[];
  };
}

export interface ExecutionOptions {
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
}

export interface ExecutionContext {
  services: Services;
  options: ExecutionOptions;
}
