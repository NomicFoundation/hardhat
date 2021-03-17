import { DefaultStateManager as StateManager } from "@ethereumjs/vm/dist/state";

import { ForkStateManager } from "../fork/ForkStateManager";

export function asStateManager(
  stateManager: StateManager | ForkStateManager
): StateManager {
  return stateManager;
}
