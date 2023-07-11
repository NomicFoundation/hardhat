import { ArtifactResolver } from "../../types/artifact";
import { DeploymentLoader } from "../../types/deployment-loader";
import {
  ExecutionSuccess,
  OnchainInteractionMessage,
  OnchainResultMessage,
} from "../../types/journal";
import {
  IgnitionModule,
  IgnitionModuleResult,
  ModuleParameters,
} from "../../types/module";

import { ChainDispatcher } from "./chain-dispatcher";
import { ExecutionState, ExecutionStateMap } from "./execution-state";

export interface ExecutionEngineState {
  block: {
    number: number;
    hash: string;
  };
  config: {
    blockPollingInterval: number;
  };
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
  accounts: string[];
  deploymentParameters: { [key: string]: ModuleParameters };
  strategy: ExecutionStrategy;
  artifactResolver: ArtifactResolver;
  deploymentLoader: DeploymentLoader;
  chainDispatcher: ChainDispatcher;
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
    OnchainInteractionMessage | ExecutionSuccess,
    OnchainResultMessage | null
  >;
}
