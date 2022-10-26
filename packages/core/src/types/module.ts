import type { IDeploymentBuilder } from "./deploymentGraph";
import type { CallableFuture, Virtual } from "./future";

export interface ModuleDict {
  [key: string]: CallableFuture | Virtual;
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
