import { StateManager } from "@nomiclabs/ethereumjs-vm/dist/state";
import VMPStateManager from "@nomiclabs/ethereumjs-vm/dist/state/promisified";

import { ForkStateManager } from "../fork/ForkStateManager";
import { PStateManager } from "../types/PStateManager";

export function asPStateManager(
  stateManager: StateManager | ForkStateManager
): PStateManager {
  return stateManager instanceof ForkStateManager
    ? stateManager
    : new VMPStateManager(stateManager);
}
