import type { ExternalParamValue, Subgraph } from "./deploymentGraph";
import type {
  CallableFuture,
  EventFuture,
  FutureDict,
  ProxyFuture,
  Virtual,
} from "./future";

export interface ModuleDict extends FutureDict {
  [key: string]: CallableFuture | Virtual | ProxyFuture | EventFuture;
}

export type Module<T extends ModuleDict> = Subgraph<T>;

export interface ModuleData {
  result: Virtual & ModuleDict;
  optionsHash: string;
}

export interface ModuleCache {
  [label: string]: ModuleData;
}

export interface ModuleParams {
  [key: string]: ExternalParamValue;
}
