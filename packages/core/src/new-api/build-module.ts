import { IgnitionError } from "../errors";

import { IgnitionModuleResult } from "./types/module";
import {
  IgnitionModuleBuilder,
  IgnitionModuleDefinition,
} from "./types/module-builder";

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
): IgnitionModuleDefinition<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
  if (typeof moduleId !== "string") {
    throw new IgnitionError(`\`moduleId\` must be a string`);
  }

  if (typeof moduleDefintionFunction !== "function") {
    throw new IgnitionError(`\`moduleDefintionFunction\` must be a function`);
  }

  return { id: moduleId, moduleDefintionFunction };
}
