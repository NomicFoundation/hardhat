import { ArtifactResolver } from "../../types/artifact";
import { DeploymentLoader } from "../../types/deployment-loader";
import {
  JournalableMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
} from "../../types/journal";
import {
  IgnitionModule,
  IgnitionModuleResult,
  ModuleParameters,
} from "../../types/module";
import { TransactionService } from "../../types/transaction-service";

import { ExecutionState, ExecutionStateMap } from "./execution-state";

export interface ExecutionEngineState {
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
  accounts: string[];
  deploymentParameters: { [key: string]: ModuleParameters };
  strategy: ExecutionStrategy;
  transactionService: TransactionService;
  artifactResolver: ArtifactResolver;
  deploymentLoader: DeploymentLoader;
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
    JournalableMessage,
    OnchainResultMessage | null
  >;
}
