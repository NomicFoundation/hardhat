import type { IgnitionModuleBuilder } from "./types/module-builder.js";
import type { IgnitionModule, IgnitionModuleResult } from "./types/module.js";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

import { ModuleConstructor } from "./internal/module-builder.js";
import { isValidIgnitionIdentifier } from "./internal/utils/identifier-validators.js";

/**
 * Construct a module definition that can be deployed through Ignition.
 *
 * @param moduleId - the id of the module
 * @param moduleDefinitionFunction - a function accepting the
 * IgnitionModuleBuilder to configure the deployment
 * @returns a module definition
 *
 * @beta
 */
export function buildModule<
  ModuleIdT extends string,
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>,
>(
  moduleId: ModuleIdT,
  moduleDefinitionFunction: (
    m: IgnitionModuleBuilder,
  ) => IgnitionModuleResultsT,
): IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
  if (typeof moduleId !== "string") {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.MODULE.INVALID_MODULE_ID,
    );
  }

  if (!isValidIgnitionIdentifier(moduleId)) {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.MODULE.INVALID_MODULE_ID_CHARACTERS,
      {
        moduleId,
      },
    );
  }

  if (typeof moduleDefinitionFunction !== "function") {
    throw new HardhatError(
      HardhatError.ERRORS.IGNITION.MODULE.INVALID_MODULE_DEFINITION_FUNCTION,
    );
  }

  const constructor = new ModuleConstructor();
  const ignitionModule = constructor.construct<
    ModuleIdT,
    ContractNameT,
    IgnitionModuleResultsT
  >({
    id: moduleId,
    moduleDefinitionFunction,
  });

  _checkForDuplicateModuleIds(ignitionModule);

  return ignitionModule;
}

/**
 * Check to ensure that there are no duplicate module ids among the root
 * module and its submodules.
 */
function _checkForDuplicateModuleIds(
  ignitionModule: IgnitionModule<string, string, IgnitionModuleResult<string>>,
): void {
  const duplicateModuleIds = [
    ignitionModule.id,
    ...Array.from(ignitionModule.submodules).map((submodule) => submodule.id),
  ].filter((id, index, array) => array.indexOf(id) !== index);

  if (duplicateModuleIds.length === 0) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.IGNITION.MODULE.DUPLICATE_MODULE_ID,
    {
      duplicateModuleIds: duplicateModuleIds.join(", "),
    },
  );
}
