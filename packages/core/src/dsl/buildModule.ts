import type { IDeploymentBuilder } from "types/deploymentGraph";
import type { Module, ModuleDict } from "types/module";
import { IgnitionError } from "utils/errors";

export function buildModule<T extends ModuleDict>(
  moduleName: string,
  moduleAction: (m: IDeploymentBuilder) => T
): Module<T> {
  assertValidModuleName(moduleName);
  assertValidModuleAction(moduleAction);

  return {
    name: moduleName,
    action: moduleAction,
  };
}

function assertValidModuleName(moduleName: any) {
  if (typeof moduleName !== "string") {
    throw new IgnitionError("buildModule: `moduleName` must be a string");
  }
}

function assertValidModuleAction(moduleAction: any) {
  if (typeof moduleAction !== "function") {
    throw new IgnitionError("buildModule: `moduleAction` must be a function");
  }
}
