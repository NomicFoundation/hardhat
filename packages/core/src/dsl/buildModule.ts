import type { IDeploymentBuilder } from "types/deploymentGraph";
import type { Module, ModuleDict } from "types/module";

export function buildModule<T extends ModuleDict>(
  moduleName: string,
  moduleAction: (m: IDeploymentBuilder) => T
): Module<T> {
  return {
    name: moduleName,
    action: moduleAction,
  };
}
