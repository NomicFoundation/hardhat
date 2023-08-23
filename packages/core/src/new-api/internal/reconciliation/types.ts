import { ArtifactResolver } from "../../types/artifact";
import { DeploymentParameters } from "../../types/deployer";
import { Future } from "../../types/module";
import { DeploymentLoader } from "../deployment-loader/types";
import { DeploymentState } from "../new-execution/types/deployment-state";
import { ExecutionState } from "../new-execution/types/execution-state";

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
  fallbackSender: string;
}

export type ReconciliationCheck = (
  future: Future,
  executionState: ExecutionState,
  context: ReconciliationContext
) => ReconciliationFutureResult | Promise<ReconciliationFutureResult>;
