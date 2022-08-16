import { assert } from "chai";

import { ExistingContractExecutor } from "../../src/executors/ExistingContractExecutor";
import { ExistingContractFuture } from "../../src/futures/ExistingContractFuture";
import { ExistingContractOptions } from "../../src/futures/types";

describe("Existing Contract - Executor", () => {
  describe("validate", () => {
    it("should pass on a valid address", async () => {
      const input: ExistingContractOptions = {
        contractName: "MyContract",
        address: "0x0000000000000000000000000000000000000000",
        abi: [],
      };

      await assertExistingContractValidation(input, []);
    });

    it("should fail on a bad address", async () => {
      const input: ExistingContractOptions = {
        contractName: "MyContract",
        address: "0x123",
        abi: [],
      };

      await assertExistingContractValidation(input, [
        "The existing contract MyContract is an invalid address 0x123",
      ]);
    });
  });
});

async function assertExistingContractValidation(
  input: ExistingContractOptions,
  expected: string[]
) {
  const future = new ExistingContractFuture("MyRecipe", "future-1", input);

  const ex = new ExistingContractExecutor(future);

  const validationResult = await ex.validate(input, {} as any);

  assert.deepStrictEqual(validationResult, expected);
}
