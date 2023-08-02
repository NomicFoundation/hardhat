/* eslint-disable import/no-unused-modules */
import { assert } from "chai";

import { buildModule } from "../../src/new-api/build-module";
import { AccountRuntimeValueImplementation } from "../../src/new-api/internal/module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";

import { assertInstanceOf } from "./helpers";

describe("getAccount", () => {
  it("should return the correct RuntimeValue", () => {
    const defintion = buildModule("MyModule", (m) => {
      const account2 = m.getAccount(2);

      const contract = m.contract("Contract", [], { from: account2 });

      return { contract };
    });

    const constructor = new ModuleConstructor();
    const mod = constructor.construct(defintion);

    assertInstanceOf(
      mod.results.contract.from,
      AccountRuntimeValueImplementation
    );
    assert.equal(mod.results.contract.from.accountIndex, 2);
  });
});
