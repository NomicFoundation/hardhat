import type { BigNumber } from "ethers";

import type { Services } from "services/types";

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
import type { ModuleDict, ModuleParams } from "./module";
import type { SerializedDeploymentResult } from "./serialization";

export type UpdateUiAction = (deployState: DeployState) => void;
export type UiParamsClosure = (moduleParams?: ModuleParams) => UpdateUiAction;

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
      force: boolean;
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
  result: null;
}

export interface VertexExecutionStateUnstarted {
  status: VertexExecutionStatusRunning;
  result: null;
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
  executionGraphHash: string;
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
  unexpected: {
    errors: Error[];
  };
}

export interface ExecutionOptions {
  maxRetries: number;
  gasPriceIncrementPerRetry: BigNumber | null;
  pollingInterval: number;
  eventDuration: number;
  force: boolean;
}

export interface ExecutionContext {
  services: Services;
  options: ExecutionOptions;
}
