import { IgnitionError } from "./errors";
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
    throw new IgnitionError(`\`moduleId\` must be a string`);
  }

  if (!isValidIgnitionIdentifier(moduleId)) {
    throw new IgnitionError(
      `The moduleId "${moduleId}" contains banned characters, ids can only contain alphanumerics or underscores`
    );
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

  return ignitionModule;
}
