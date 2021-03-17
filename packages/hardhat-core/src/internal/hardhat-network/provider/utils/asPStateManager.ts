import { StateManager } from "@ethereumjs/vm/dist/state";

import { ForkStateManager } from "../fork/ForkStateManager";

export function asPStateManager(
  stateManager: StateManager | ForkStateManager
): StateManager {
  return stateManager;
  /*return stateManager instanceof ForkStateManager
    ? stateManager
    : new VMPStateManager(stateManager);*/
}
