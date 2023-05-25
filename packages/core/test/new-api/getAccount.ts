import { assert } from "chai";

import { RuntimeValueType } from "../../src";
import { defineModule } from "../../src/new-api/define-module";
import { ModuleConstructor } from "../../src/new-api/internal/module-builder";

describe("getAccount", () => {
  it("should return the correct RuntimeValue", () => {
    const defintion = defineModule("MyModule", (m) => {
      const account1 = m.getAccount(1);
      const account2 = m.getAccount(2);

      const contract = m.contract("Contract", [account1], { from: account2 });

      return { contract };
    });

    const constructor = new ModuleConstructor();
    const mod = constructor.construct(defintion);

    assert.deepEqual(mod.results.contract.constructorArgs[0], {
      type: RuntimeValueType.ACCOUNT,
      accountIndex: 1,
    });

    assert.deepEqual(mod.results.contract.from, {
      type: RuntimeValueType.ACCOUNT,
      accountIndex: 2,
    });
  });
});
