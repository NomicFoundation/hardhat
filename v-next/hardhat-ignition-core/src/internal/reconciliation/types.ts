import type { ArtifactResolver } from "../../types/artifact";
import type { DeploymentParameters } from "../../types/deploy";
import type { Future } from "../../types/module";
import type { DeploymentLoader } from "../deployment-loader/types";
import type { DeploymentState } from "../execution/types/deployment-state";
import type {
  ConcreteExecutionConfig,
  ExecutionState,
} from "../execution/types/execution-state";

export interface ReconciliationFailure {
  futureId: string;
  failure: string;
}

interface ReconciliationFutureResultSuccess {
  success: true;
}

export interface ReconciliationFutureResultFailure {
  success: false;
  failure: ReconciliationFailure;
}

export type ReconciliationFutureResult =
  | ReconciliationFutureResultSuccess
  | ReconciliationFutureResultFailure;

export interface ReconciliationResult {
  reconciliationFailures: ReconciliationFailure[];
  missingExecutedFutures: string[];
}

export interface ReconciliationContext {
  deploymentState: DeploymentState;
  deploymentParameters: DeploymentParameters;
  accounts: string[];
  artifactResolver: ArtifactResolver;
  deploymentLoader: DeploymentLoader;
  defaultSender: string;
  strategy: string;
  strategyConfig: ConcreteExecutionConfig;
}

export type ReconciliationCheck = (
  future: Future,
  executionState: ExecutionState,
  context: ReconciliationContext,
) => ReconciliationFutureResult | Promise<ReconciliationFutureResult>;
