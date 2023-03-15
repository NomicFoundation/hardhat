import type { IDeploymentBuilder } from "../types/deploymentGraph";
import type { Module, ModuleDict } from "../types/module";

import { assertStringParam, assertFunctionParam } from "../utils/errors";

export function buildModule<T extends ModuleDict>(
  moduleName: string,
  moduleAction: (m: IDeploymentBuilder) => T
): Module<T> {
  assertStringParam(moduleName, "moduleName");
  assertFunctionParam(moduleAction, "moduleAction");

  return {
    name: moduleName,
    action: moduleAction,
  };
}
