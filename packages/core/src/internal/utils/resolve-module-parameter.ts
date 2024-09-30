import { isAccountRuntimeValue } from "../../type-guards";
import { DeploymentParameters } from "../../types/deploy";
import {
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  SolidityParameterType,
} from "../../types/module";
import { resolveAccountRuntimeValue } from "../execution/future-processor/helpers/future-resolvers";

import { assertIgnitionInvariant } from "./assertions";

export function resolveModuleParameter(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<ModuleParameterType>,
  context: { deploymentParameters: DeploymentParameters; accounts: string[] }
): SolidityParameterType {
  if (context.deploymentParameters === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return _resolveDefaultValue(moduleParamRuntimeValue, context.accounts);
  }

  const moduleParameters =
    context.deploymentParameters[moduleParamRuntimeValue.moduleId] ??
    context.deploymentParameters.$global;

  if (moduleParameters === undefined) {
    assertIgnitionInvariant(
      moduleParamRuntimeValue.defaultValue !== undefined,
      `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
    );

    return _resolveDefaultValue(moduleParamRuntimeValue, context.accounts);
  }

  const moduleParamValue = moduleParameters[moduleParamRuntimeValue.name];

  if (moduleParamValue === undefined) {
    return _resolveDefaultValue(moduleParamRuntimeValue, context.accounts);
  }

  return moduleParamValue;
}

function _resolveDefaultValue(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<ModuleParameterType>,
  accounts: string[]
): SolidityParameterType {
  assertIgnitionInvariant(
    moduleParamRuntimeValue.defaultValue !== undefined,
    `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`
  );

  if (isAccountRuntimeValue(moduleParamRuntimeValue.defaultValue)) {
    return resolveAccountRuntimeValue(
      moduleParamRuntimeValue.defaultValue,
      accounts
    );
  }

  return moduleParamRuntimeValue.defaultValue;
}
