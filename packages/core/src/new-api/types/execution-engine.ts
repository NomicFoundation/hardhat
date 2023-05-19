import { ExecutionStateMap } from "./execution-state";
import { IgnitionModule, IgnitionModuleResult } from "./module";

export interface ExecutionEngineState {
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
}
