import { IgnitionModuleResult } from "./types/module";
import {
  IgnitionModuleBuilder,
  IgnitionModuleDefinition,
} from "./types/module-builder";

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
