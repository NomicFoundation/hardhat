import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeSelector, isValidCalldata, formatValues } from "../src/abi.js";

describe("abi", () => {
  describe("computeSelector", () => {
    it("Should compute the selector", async () => {
      const fragment = {
        name: "transferFrom",
        inputs: [
          { type: "address", name: "from" },
          { type: "address", name: "to" },
          { type: "uint256", name: "value" },
        ],
      };

      const selector = await computeSelector(fragment.name, fragment.inputs);

      assert.equal(Buffer.from(selector).toString("hex"), "23b872dd");
    });

    it("Should throw AbiError if it can't compute the selector", async () => {
      // This can happen if the fragment is a constructor, as it doesn't have a name
      const constructorFragment = {
        name: undefined,
        inputs: [
          { type: "address", name: "from" },
          { type: "address", name: "to" },
          { type: "uint256", name: "value" },
        ],
      };
      await assert.rejects(
        async () => {
          await computeSelector(
            constructorFragment.name as any,
            constructorFragment.inputs,
          );
        },
        {
          name: "AbiError",
          message: "Cannot compute selector",
        },
      );

      // or if the inputs can't be recognized
      const invalidFragment = {
        name: "invalidFragment",
        inputs: [{ not: "an-input" }],
      };
      await assert.rejects(
        async () => {
          await computeSelector(
            invalidFragment.name,
            invalidFragment.inputs as any,
          );
        },
        {
          name: "AbiError",
          message: "Cannot compute selector",
        },
      );
    });
  });

  describe("isValidCalldata", () => {
    it("Should return true if the calldata is valid", async () => {
      const calldata =
        "00000000000000000000000000000000000000000000000000000000000004d20000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20576f726c64000000000000000000000000000000000000000000";
      const isValid = await isValidCalldata(
        ["uint", "string"],
        Buffer.from(calldata, "hex"),
      );

      assert.ok(isValid);
    });

    it("Should return false if the calldata is invalid", async () => {
      const calldata = "not-valid";
      const isValid = await isValidCalldata(
        ["uint", "string"],
        Buffer.from(calldata, "hex"),
      );

      assert.ok(!isValid);
    });
  });

  describe("formatValues", () => {
    it("Should format values correctly", async () => {
      const values = [1234n, [5678n, "Hello World"]];

      const formatted = formatValues(values);

      assert.equal(formatted, '1234, [5678, "Hello World"]');
    });
  });
});
