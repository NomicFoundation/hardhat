import type { BigNumber } from "ethers";

import { Services } from "services/types";

import { ExecutionVertex } from "./executionGraph";
import {
  IGraph,
  VertexDescriptor,
  VertexVisitResult,
  VertexVisitResultFailure,
  VertexVisitResultSuccess,
} from "./graph";
import { ModuleParams } from "./module";
import {
  SerializedDeploymentResult,
  SerializedFutureResult,
} from "./serialization";

export type UpdateUiAction = (deployState: DeployState) => void;
export type UiParamsClosure = (moduleParams?: ModuleParams) => UpdateUiAction;

export interface IgnitionModuleResults {
  load: (moduleId: string) => Promise<SerializedFutureResult | undefined>;
  save: (
    moduleId: string,
    moduleResult: SerializedFutureResult
  ) => Promise<void>;
}

export type DeploymentResult =
  | { _kind: "failure"; failures: [string, Error[]] }
  | { _kind: "hold"; holds: VertexDescriptor[] }
  | { _kind: "success"; result: SerializedDeploymentResult };

export type DeployPhase =
  | "uninitialized"
  | "validating"
  | "execution"
  | "complete"
  | "failed"
  | "hold"
  | "validation-failed";

export type DeployStateExecutionCommand =
  | {
      type: "EXECUTION::START";
    }
  | {
      type: "EXECUTION::SET_BATCH";
      batch: number[];
    }
  | {
      type: "EXECUTION::SET_VERTEX_RESULT";
      vertexId: number;
      result: VertexVisitResult;
    };

export type DeployStateCommand =
  | { type: "SET_CHAIN_ID"; chainId: number }
  | { type: "SET_NETWORK_NAME"; networkName: string }
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
  result: null;
}

export interface VertexExecutionStateUnstarted {
  status: VertexExecutionStatusRunning;
  result: null;
}

export interface VertexExecutionStateCompleted {
  status: VertexExecutionStatusCompleted;
  result: VertexVisitResultSuccess;
}

export interface VertexExecutionStateFailed {
  status: VertexExecutionStatusFailed;
  result: VertexVisitResultFailure;
}

export interface VertexExecutionStateHold {
  status: VertexExecutionStatusHold;
  result: null;
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
}

export interface DeployNetworkConfig {
  moduleName: string;
  chainId: number;
  networkName: string;
}

export interface DeployState {
  phase: DeployPhase;
  details: DeployNetworkConfig;
  validation: ValidationState;
  transform: {
    executionGraph: IGraph<ExecutionVertex> | null;
  };
  execution: ExecutionState;
}

export interface ExecutionOptions {
  maxRetries: number;
  gasIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  awaitEventDuration: number;
}

export interface ExecutionContext {
  services: Services;
  options: ExecutionOptions;
}
