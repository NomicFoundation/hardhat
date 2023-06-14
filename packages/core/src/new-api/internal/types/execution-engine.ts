import { ExecutionStateMap } from "../../types/execution-state";
import { IgnitionModule, IgnitionModuleResult } from "../../types/module";

export interface ExecutionEngineState {
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
}
