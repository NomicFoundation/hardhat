import { ArtifactResolver } from "../../types/artifact";
import { DeployConfig, DeploymentParameters } from "../../types/deployer";
import { IgnitionModule, IgnitionModuleResult } from "../../types/module";

import { ChainDispatcher } from "./chain-dispatcher";
import { DeploymentLoader } from "./deployment-loader";
import { ExecutionState, ExecutionStateMap } from "./execution-state";
import {
  ExecutionSuccess,
  OnchainInteractionMessage,
  OnchainResultMessage,
} from "./journal";
import { TransactionLookupTimer } from "./transaction-timer";

export interface ExecutionEngineState {
  block: {
    number: number;
    hash: string;
  };
  config: DeployConfig;
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
  accounts: string[];
  deploymentParameters: DeploymentParameters;
  strategy: ExecutionStrategy;
  artifactResolver: ArtifactResolver;
  deploymentLoader: DeploymentLoader;
  chainDispatcher: ChainDispatcher;
  transactionLookupTimer: TransactionLookupTimer;
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
