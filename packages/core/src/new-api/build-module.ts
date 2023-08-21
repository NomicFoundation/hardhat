import { IgnitionError } from "../errors";

import { ModuleConstructor } from "./internal/module-builder";
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
    throw new IgnitionError(`\`moduleId\` must be a string`);
  }

  if (typeof moduleDefintionFunction !== "function") {
    throw new IgnitionError(`\`moduleDefintionFunction\` must be a function`);
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

  // todo: validation

  return ignitionModule;
}
