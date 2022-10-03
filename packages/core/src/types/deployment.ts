import { ExecutionGraph } from "execution/ExecutionGraph";

import { VertexVisitResult } from "./graph";
import {
  SerializedDeploymentResult,
  SerializedFutureResult,
} from "./serialization";

export type UpdateUiAction = (deployState: DeployState) => void;

export interface IgnitionRecipesResults {
  load: (recipeId: string) => Promise<SerializedFutureResult | undefined>;
  save: (
    recipeId: string,
    recipeResult: SerializedFutureResult
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

  resultsAccumulator: Map<number, VertexVisitResult>;
}

export interface DeployState {
  phase: DeployPhase;
  details: {
    recipeName: string;
    chainId: number;
  };
  validation: ValidationState;
  transform: {
    executionGraph: ExecutionGraph | null;
  };
  execution: ExecutionState;
}
