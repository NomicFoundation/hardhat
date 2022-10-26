import type { IDeploymentBuilder } from "./deploymentGraph";
import type { CallableFuture } from "./future";

export interface ModuleDict {
  [key: string]: CallableFuture;
}

export interface Module {
  name: string;
  moduleAction: (builder: IDeploymentBuilder) => ModuleDict;
}

export interface ModuleData {
  result: ModuleDict;
  optionsHash: string;
}

export interface ModuleCache {
  [label: string]: ModuleData;
}
