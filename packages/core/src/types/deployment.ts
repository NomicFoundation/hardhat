import type { BigNumber } from "ethers";

import { ExecutionGraph } from "execution/ExecutionGraph";
import { Services } from "services/types";

import { ResultsAccumulator, VertexVisitResult } from "./graph";
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
  | { _kind: "hold"; holds: [string, string[]] }
  | { _kind: "success"; result: SerializedDeploymentResult };

export type DeployPhase =
  | "uninitialized"
  | "validating"
  | "execution"
  | "complete"
  | "failed"
  | "validation-failed";

export interface ValidationState {
  errors: Error[];
}

export interface ExecutionState {
  unstarted: Set<number>;
  onHold: Set<number>;
  completed: Set<number>;
  errored: Set<number>;

  batch: Map<number, null | VertexVisitResult>;
  previousBatches: Array<Set<number>>;

  resultsAccumulator: ResultsAccumulator;
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
    executionGraph: ExecutionGraph | null;
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
