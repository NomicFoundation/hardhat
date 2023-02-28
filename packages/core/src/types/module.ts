import type { ExternalParamValue, IDeploymentBuilder } from "./deploymentGraph";
import type {
  ContractFuture,
  FutureDict,
  LibraryFuture,
  ProxyFuture,
  Virtual,
} from "./future";

export type ModuleReturnValue =
  | ContractFuture
  | LibraryFuture
  | Virtual
  | ProxyFuture;

export interface ModuleDict {
  [key: string]: ModuleReturnValue;
}

export type Module<T extends ModuleDict> = Subgraph<T>;

export interface Subgraph<T extends FutureDict> {
  name: string;
  action: (builder: IDeploymentBuilder) => T;
}

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
