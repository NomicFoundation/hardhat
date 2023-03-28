import type { IDeploymentBuilder } from "../internal/types/deploymentGraph";
import type { Module, ModuleDict } from "../types/module";

import {
  assertFunctionParam,
  assertStringParam,
} from "../internal/utils/paramAssertions";

/**
 * A factory that builds a deployment module given configuration function that
 * manipulates an injected deployment builder.
 *
 * @param moduleName - The name that will be used for the module internally and in
 * logging and the UI.
 * @param moduleConfigurationAction - A non-async function that configures the
 * deployment.
 * @returns An Ignition module that can be deployed.
 *
 * @alpha
 */
export function buildModule<T extends ModuleDict>(
  moduleName: string,
  moduleConfigurationAction: (m: IDeploymentBuilder) => T
): Module<T> {
  assertStringParam(moduleName, "moduleName");
  assertFunctionParam(moduleConfigurationAction, "moduleAction");

  return {
    name: moduleName,
    action: moduleConfigurationAction,
  };
}
