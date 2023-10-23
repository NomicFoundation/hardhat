import { IgnitionError } from "./errors";
import { ERRORS } from "./errors-list";
import { ModuleConstructor } from "./internal/module-builder";
import { isValidIgnitionIdentifier } from "./internal/utils/identifier-validators";
import { IgnitionModule, IgnitionModuleResult } from "./types/module";
import { IgnitionModuleBuilder } from "./types/module-builder";

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
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
>(
  moduleId: ModuleIdT,
  moduleDefintionFunction: (m: IgnitionModuleBuilder) => IgnitionModuleResultsT
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

  return ignitionModule;
}
