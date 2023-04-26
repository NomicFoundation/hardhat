import { inspect } from "util";

import { IgnitionModuleImplementation } from "./internal/module";
import { IgnitionModuleBuilderImplementation } from "./internal/module-builder";
import { IgnitionModule, IgnitionModuleResult } from "./types/module";
import { IgnitionModuleBuilder } from "./types/module-builder";

const STUB_MODULE_RESULTS = {
  [inspect.custom]() {
    return "<Module being constructed - No results available yet>";
  },
};

export function buildModule<
  ModuleIdT extends string,
  ContractNameT extends string,
  IgnitionModuleResultsT extends IgnitionModuleResult<ContractNameT>
>(
  moduleId: ModuleIdT,
  factory: (m: IgnitionModuleBuilder) => IgnitionModuleResultsT
): IgnitionModule<ModuleIdT, ContractNameT, IgnitionModuleResultsT> {
  // TODO: validate that moduleId is unique. How do we do it?? Maybe later? Is there a global context?

  const mod = new IgnitionModuleImplementation<
    ModuleIdT,
    ContractNameT,
    IgnitionModuleResultsT
  >(moduleId, STUB_MODULE_RESULTS as any);

  (mod as any).results = factory(new IgnitionModuleBuilderImplementation(mod));

  return mod;
}
