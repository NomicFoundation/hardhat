import type { IgnitionModule, IgnitionModuleResult } from "./types/module";
import type { IgnitionModuleBuilder } from "./types/module-builder";

import { IgnitionError } from "./errors";
import { ERRORS } from "./internal/errors-list";
import { ModuleConstructor } from "./internal/module-builder";
import { isValidIgnitionIdentifier } from "./internal/utils/identifier-validators";

/**
 * Construct a module definition that can be deployed through Ignition.
 *
 * @param moduleId - the id of the module
 * @param moduleDefintionFunction - a function accepting the
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
  moduleDefintionFunction: (m: IgnitionModuleBuilder) => IgnitionModuleResultsT,
): IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
  if (typeof moduleId !== "string") {
    throw new IgnitionError(ERRORS.MODULE.INVALID_MODULE_ID);
  }

  if (!isValidIgnitionIdentifier(moduleId)) {
    throw new IgnitionError(ERRORS.MODULE.INVALID_MODULE_ID_CHARACTERS, {
      moduleId,
    });
  }

  if (typeof moduleDefintionFunction !== "function") {
    throw new IgnitionError(ERRORS.MODULE.INVALID_MODULE_DEFINITION_FUNCTION);
  }

  const constructor = new ModuleConstructor();
  const ignitionModule = constructor.construct<
    ModuleIdT,
    ContractNameT,
    IgnitionModuleResultsT
  >({
    id: moduleId,
    moduleDefintionFunction,
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

  throw new IgnitionError(ERRORS.MODULE.DUPLICATE_MODULE_ID, {
    duplicateModuleIds: duplicateModuleIds.join(", "),
  });
}
