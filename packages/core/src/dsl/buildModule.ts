import type { IDeploymentBuilder } from "../internal/types/deploymentGraph";
import type { Module, ModuleDict } from "../types/module";

import {
  assertFunctionParam,
  assertStringParam,
} from "../internal/utils/paramAssertions";

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
