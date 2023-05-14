import { IgnitionModuleResult } from "./types/module";
import {
  IgnitionModuleDefinition,
  IgnitionModuleBuilder,
} from "./types/module-builder";

export function buildModule<
  ModuleIdT extends string,
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
>(
  moduleId: ModuleIdT,
  moduleDefintionFunction: (m: IgnitionModuleBuilder) => IgnitionModuleResultsT
): IgnitionModuleDefinition<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
  return { id: moduleId, moduleDefintionFunction };
}
