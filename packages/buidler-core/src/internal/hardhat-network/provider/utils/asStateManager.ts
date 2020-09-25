import { ForkStateManager } from "../fork/ForkStateManager";
import { StateManager } from "../types/StateManager";

export function asStateManager(
  stateManager: StateManager | ForkStateManager
): StateManager {
  return stateManager instanceof ForkStateManager
    ? stateManager.asStateManager()
    : stateManager;
}
