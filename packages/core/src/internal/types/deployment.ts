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

export type UpdateUiAction = (deployState: DeployState) => void;
export type UiParamsClosure = (moduleParams?: ModuleParams) => UpdateUiAction;

export interface IgnitionDeployOptions {
  txPollingInterval: number;
  networkName: string;
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
  force: boolean;
}

export type DeploymentResult<T extends ModuleDict = ModuleDict> =
  | { _kind: "failure"; failures: [string, Error[]] }
  | { _kind: "hold"; holds: VertexDescriptor[] }
  | { _kind: "success"; result: SerializedDeploymentResult<T> };

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

export interface ValidationState {
  errors: Error[];
}

export type VertexExecutionStatusUnstarted = "UNSTARTED";
export type VertexExecutionStatusRunning = "RUNNING";
export type VertexExecutionStatusCompleted = "COMPLETED";
export type VertexExecutionStatusFailed = "FAILED";
export type VertexExecutionStatusHold = "HOLD";

export type VertexExecutionStatus =
  | VertexExecutionStatusUnstarted
  | VertexExecutionStatusRunning
  | VertexExecutionStatusCompleted
  | VertexExecutionStatusFailed
  | VertexExecutionStatusHold;

export interface VertexExecutionStateRunning {
  status: VertexExecutionStatusUnstarted;
  result: undefined;
}

export interface VertexExecutionStateUnstarted {
  status: VertexExecutionStatusRunning;
  result: undefined;
}

export interface VertexExecutionStateCompleted {
  status: VertexExecutionStatusCompleted;
  result: VertexVisitResultSuccess<VertexVisitResultSuccessResult>;
}

export interface VertexExecutionStateFailed {
  status: VertexExecutionStatusFailed;
  result: VertexVisitResultFailure;
}

export interface VertexExecutionStateHold {
  status: VertexExecutionStatusHold;
  result: undefined;
}

export type VertexExecutionState =
  | VertexExecutionStateUnstarted
  | VertexExecutionStateRunning
  | VertexExecutionStateCompleted
  | VertexExecutionStateFailed
  | VertexExecutionStateHold;

export interface ExecutionState {
  run: number;
  vertexes: { [key: number]: VertexExecutionState };
  batch: Set<number> | null;
  previousBatches: Array<Set<number>>;
  executionGraphHash: string;
}

export interface DeployNetworkConfig {
  moduleName: string;
  chainId: number;
  networkName: string;
  accounts: string[];
  artifacts: Artifact[];
  force: boolean;
}

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
