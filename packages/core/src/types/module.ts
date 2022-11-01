import { Subgraph } from "./deploymentGraph";
import type {
  CallableFuture,
  FutureDict,
  ProxyFuture,
  Virtual,
} from "./future";

export interface ModuleDict extends FutureDict {
  [key: string]: CallableFuture | Virtual | ProxyFuture;
}

export type Module<T extends ModuleDict> = Subgraph<T>;

export interface ModuleData {
  result: Virtual & ModuleDict;
  optionsHash: string;
}

export interface ModuleCache {
  [label: string]: ModuleData;
}
