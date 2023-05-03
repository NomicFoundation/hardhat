/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";

describe("useModule", () => {
  it("should be able to use a submodule", () => {
    const submodule = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmodule = buildModule("Module1", (m) => {
      const { contract1 } = m.useModule(submodule);

      return { contract1 };
    });

    // the submodule is linked
    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("returns the same result set (object equal) for each usage", () => {
    const submodule = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmodule = buildModule("Module1", (m) => {
      const { contract1: first } = m.useModule(submodule);
      const { contract1: second } = m.useModule(submodule);

      return { first, second };
    });

    assert.equal(
      moduleWithSubmodule.results.first,
      moduleWithSubmodule.results.second
    );

    assert.equal(moduleWithSubmodule.submodules.size, 1);
    assert(moduleWithSubmodule.submodules.has(submodule));
  });

  it("supports dependending on returned results", () => {
    const submodule = buildModule("Submodule1", (m) => {
      const contract1 = m.contract("Contract1");

      return { contract1 };
    });

    const moduleWithSubmodule = buildModule("Module1", (m) => {
      const { contract1 } = m.useModule(submodule);

      const contract2 = m.contract("Contract2", [contract1]);

      return { contract2 };
    });

    assert(
      moduleWithSubmodule.results.contract2.dependencies.has(
        submodule.results.contract1
      )
    );
  });
});
