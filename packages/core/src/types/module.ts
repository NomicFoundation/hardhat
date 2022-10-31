import { Subgraph } from "./deploymentGraph";
import type { CallableFuture, FutureDict, Virtual } from "./future";

export interface ModuleDict extends FutureDict {
  [key: string]: CallableFuture | Virtual;
}

export type Module<T extends ModuleDict> = Subgraph<T>;

export interface ModuleData {
  result: ModuleDict;
  optionsHash: string;
}

export interface ModuleCache {
  [label: string]: ModuleData;
}
