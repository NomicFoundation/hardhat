import { IgnitionModule, IgnitionModuleResult } from "../../types/module";

import { ExecutionStateMap } from "./execution-state";

export interface ExecutionEngineState {
  batches: string[][];
  module: IgnitionModule<string, string, IgnitionModuleResult<string>>;
  executionStateMap: ExecutionStateMap;
}
