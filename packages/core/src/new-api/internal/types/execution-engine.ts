import {
  Journal,
  JournalableMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
} from "../../types/journal";
import { IgnitionModule, IgnitionModuleResult } from "../../types/module";
import { TransactionService } from "../../types/transaction-service";

import { ExecutionState, ExecutionStateMap } from "./execution-state";

export interface ExecutionEngineState {
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
  accounts: string[];
  strategy: ExecutionStrategy;
  journal: Journal;
  transactionService: TransactionService;
}

export interface ExecutionStrategy {
  executeStrategy: ({
    executionState,
  }: {
    executionState: ExecutionState;
  }) => AsyncGenerator<
    OnchainInteractionMessage,
    JournalableMessage,
    OnchainResultMessage | null
  >;
}
