import type { IDeploymentBuilder } from "types/deploymentGraph";
import type { Module, ModuleDict } from "types/module";

export function buildModule(
  moduleName: string,
  moduleAction: (m: IDeploymentBuilder) => ModuleDict
): Module {
  return {
    name: moduleName,
    moduleAction,
  };
}
