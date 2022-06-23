import { assert } from "chai";

import { ExistingContractBinding } from "../../src/bindings/ExistingContractBinding";
import { ExistingContractExecutor } from "../../src/executors/ExistingContractExecutor";
import { ExistingContractOptions } from "../bindings/types";

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
  const binding = new ExistingContractBinding("MyModule", "binding-1", input);

  const ex = new ExistingContractExecutor(binding);

  const validationResult = await ex.validate(input, {} as any);

  assert.deepStrictEqual(validationResult, expected);
}
