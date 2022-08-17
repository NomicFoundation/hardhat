import { assert } from "chai";

import { ExistingContractFuture } from "../../src/futures/ExistingContractFuture";
import { ExistingContractOptions } from "../../src/futures/types";

describe("Existing Contract - future", () => {
  it("has no dependencies", () => {
    const input: ExistingContractOptions = {
      contractName: "MyContract",
      address: "0x0000000000000000000000000000000000000000",
      abi: [],
    };

    const future = new ExistingContractFuture("MyRecipe", "future-1", input);

    assert.deepStrictEqual(future.getDependencies(), []);
  });
});
