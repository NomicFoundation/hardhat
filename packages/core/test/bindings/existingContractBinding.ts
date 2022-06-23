import { assert } from "chai";

import { ExistingContractBinding } from "../../src/bindings/ExistingContractBinding";
import { ExistingContractOptions } from "../../src/bindings/types";

describe("Existing Contract - binding", () => {
  it("has no dependencies", () => {
    const input: ExistingContractOptions = {
      contractName: "MyContract",
      address: "0x0000000000000000000000000000000000000000",
      abi: [],
    };

    const binding = new ExistingContractBinding("MyModule", "binding-1", input);

    assert.deepStrictEqual(binding.getDependencies(), []);
  });
});
