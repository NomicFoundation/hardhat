import { assert } from "chai";

import { buildModule } from "../src/build-module.js";
import { AccountRuntimeValueImplementation } from "../src/internal/module.js";

import { assertInstanceOf } from "./helpers.js";

describe("getAccount", () => {
  it("should return the correct RuntimeValue", () => {
    const mod = buildModule("MyModule", (m) => {
      const account2 = m.getAccount(2);

      const contract = m.contract("Contract", [], { from: account2 });

      return { contract };
    });

    assertInstanceOf(
      mod.results.contract.from,
      AccountRuntimeValueImplementation,
    );
    assert.equal(mod.results.contract.from.accountIndex, 2);
  });
});
