import { DeploymentParameters } from "../../types/deployer";
import {
  ModuleParameterRuntimeValue,
  ModuleParameterType,
} from "../../types/module";

import { assertIgnitionInvariant } from "./assertions";

export function resolveModuleParameter(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<ModuleParameterType>,
  context: { deploymentParameters: DeploymentParameters }
): ModuleParameterType {
  if (context.deploymentParameters === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  const moduleParameters =
    context.deploymentParameters[moduleParamRuntimeValue.moduleId];

  if (moduleParameters === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  const moduleParamValue = moduleParameters[moduleParamRuntimeValue.name];

  if (moduleParamValue === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return moduleParamRuntimeValue.defaultValue;
  }

  return moduleParamValue;
}
