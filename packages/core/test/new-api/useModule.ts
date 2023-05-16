import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";

describe("useModule", () => {
  it("should be able to use a submodule", () => {
    const submoduleDefinition = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmoduleDefinition = buildModule("Module1", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      return { contract1 };
    });

    const constructor = new ModuleConstructor(0);
    const submodule = constructor.construct(submoduleDefinition);
    const moduleWithSubmodule = constructor.construct(
      moduleWithSubmoduleDefinition
    );

    // the submodule is linked
    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("returns the same result set (object equal) for each usage", () => {
    const submoduleDefinition = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmoduleDefinition = buildModule("Module1", (m) => {
      const { contract1: first } = m.useModule(submoduleDefinition);
      const { contract1: second } = m.useModule(submoduleDefinition);

      return { first, second };
    });

    const constructor = new ModuleConstructor(0);
    const submodule = constructor.construct(submoduleDefinition);
    const moduleWithSubmodule = constructor.construct(
      moduleWithSubmoduleDefinition
    );

    assert.equal(
      moduleWithSubmodule.results.first,
      moduleWithSubmodule.results.second
    );

    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("supports dependending on returned results", () => {
    const submoduleDefinition = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmoduleDefinition = buildModule("Module1", (m) => {
      const { contract1 } = m.useModule(submoduleDefinition);

      const contract2 = m.contract("Contract2", [contract1]);

      return { contract2 };
    });

    const constructor = new ModuleConstructor(0);
    const submodule = constructor.construct(submoduleDefinition);
    const moduleWithSubmodule = constructor.construct(
      moduleWithSubmoduleDefinition
    );

    assert(
      moduleWithSubmodule.results.contract2.dependencies.has(
        submodule.results.contract1
      )
    );
  });
});
