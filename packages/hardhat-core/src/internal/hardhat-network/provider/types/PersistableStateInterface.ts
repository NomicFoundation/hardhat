import { StateManager } from "@ethereumjs/vm/dist/state";
import { Map } from "immutable";

export interface PersistableStateManager extends StateManager {
  dumpState(): Promise<Map<string, any>>;
  loadState(state: Map<string, any>): Promise<void>;
}
