import type { DeploymentParameters } from "../../types/deploy.js";
import type {
  ModuleParameterRuntimeValue,
  ModuleParameterType,
  SolidityParameterType,
} from "../../types/module.js";

import { isAccountRuntimeValue } from "../../type-guards.js";
import { resolveAccountRuntimeValue } from "../execution/future-processor/helpers/future-resolvers.js";

import { assertIgnitionInvariant } from "./assertions.js";

export function resolveModuleParameter(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<ModuleParameterType>,
  context: { deploymentParameters: DeploymentParameters; accounts: string[] },
): SolidityParameterType {
  const potentialParamAtModuleLevel =
    context.deploymentParameters?.[moduleParamRuntimeValue.moduleId]?.[
      moduleParamRuntimeValue.name
    ];

  if (potentialParamAtModuleLevel !== undefined) {
    return potentialParamAtModuleLevel;
  }

  const potentialParamAtGlobalLevel =
    context.deploymentParameters?.$global?.[moduleParamRuntimeValue.name];

  if (potentialParamAtGlobalLevel !== undefined) {
    return potentialParamAtGlobalLevel;
  }

  assertIgnitionInvariant(
    moduleParamRuntimeValue.defaultValue !== undefined,
    `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`,
  );

  return _resolveDefaultValue(moduleParamRuntimeValue, context.accounts);
}

function _resolveDefaultValue(
  moduleParamRuntimeValue: ModuleParameterRuntimeValue<ModuleParameterType>,
  accounts: string[],
): SolidityParameterType {
  assertIgnitionInvariant(
    moduleParamRuntimeValue.defaultValue !== undefined,
    `No default value provided for module parameter ${moduleParamRuntimeValue.moduleId}/${moduleParamRuntimeValue.name}`,
  );

  if (isAccountRuntimeValue(moduleParamRuntimeValue.defaultValue)) {
    return resolveAccountRuntimeValue(
      moduleParamRuntimeValue.defaultValue,
      accounts,
    );
  }

  return moduleParamRuntimeValue.defaultValue;
}
