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
export function defineModule<
  ModuleIdT extends string,
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
>(
  moduleId: ModuleIdT,
  moduleDefintionFunction: (m: IgnitionModuleBuilder) => IgnitionModuleResultsT
): IgnitionModuleDefinition<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
  return { id: moduleId, moduleDefintionFunction };
}
