import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  captureConsole,
} from "@nomicfoundation/hardhat-test-utils";

import hhu from "../../../../../../src/internal/builtin-plugins/hhu/index.js";
import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

const ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const ONE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
// Parsing and hashing signatures is covered by the hardhat-utils abi tests;
// these tests only verify the task wiring and how parsing errors are reported.
describe("hhu utils abi tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment(
      { plugins: [hhu] },
      {},
      process.cwd(),
    );
  });

  describe("encode-args", () => {
    async function runEncodeArgs(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "abi", "encode-args"])
        .run(taskArguments);
    }

    it("encodes the values of a function signature", async () => {
      await runEncodeArgs({
        signature: "f(uint256,bool)",
        values: ["1", "true"],
      });

      assert.deepEqual(capture.lines, [ONE + ONE.slice(2)]);
    });

    it("encodes the values of a bare parameter list", async () => {
      await runEncodeArgs({
        signature: "(address,uint256)",
        values: [ADDRESS, "1000"],
      });

      assert.deepEqual(capture.lines, [
        "0x0000000000000000000000005aaeb6053f3e94c9b9a09f33669435e7ef1beaed00000000000000000000000000000000000000000000000000000000000003e8",
      ]);
    });

    it("encodes an array written as JSON", async () => {
      await runEncodeArgs({ signature: "f(uint256[])", values: ["[1,2]"] });

      assert.deepEqual(capture.lines, [
        "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002",
      ]);
    });

    it("keeps integers beyond 2^53 exact inside JSON", async () => {
      await runEncodeArgs({
        signature: "f(uint256[])",
        values: ["[1000000000000000000]"],
      });

      assert.deepEqual(capture.lines, [
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000",
      ]);
    });

    it("encodes a tuple written as a JSON array or as a JSON object", async () => {
      await runEncodeArgs({
        signature: "f((uint256 a, bool b))",
        values: ["[1,true]"],
      });
      await runEncodeArgs({
        signature: "f((uint256 a, bool b))",
        values: ['{"a":1,"b":true}'],
      });

      assert.deepEqual(capture.lines, [ONE + ONE.slice(2), ONE + ONE.slice(2)]);
    });

    it("encodes a string as written, without parsing it", async () => {
      await runEncodeArgs({ signature: "f(string)", values: ["[1]"] });

      assert.deepEqual(capture.lines, [
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000035b315d0000000000000000000000000000000000000000000000000000000000",
      ]);
    });

    it("encodes a negative integer", async () => {
      await runEncodeArgs({ signature: "f(int256)", values: ["-1"] });

      assert.deepEqual(capture.lines, [
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      ]);
    });

    it("prints 0x for a signature without parameters", async () => {
      await runEncodeArgs({ signature: "f()" });

      assert.deepEqual(capture.lines, ["0x"]);
    });

    it("throws when the number of values doesn't match", async () => {
      await assertRejectsWithHardhatError(
        runEncodeArgs({ signature: "f(uint256,bool)", values: ["1"] }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "1",
          name: "values",
          reason: "Expected 2 values to encode, but 1 were provided.",
        },
      );
    });

    it("throws when a value can't be encoded as its type", async () => {
      await assertRejectsWithHardhatError(
        runEncodeArgs({ signature: "f(uint256,bool)", values: ["1", "maybe"] }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "1 maybe",
          name: "values",
          reason:
            'The value provided for the parameter "[1]" of type "bool" cannot be encoded. Reason: invalid boolean value.',
        },
      );
    });

    it("throws when an array isn't valid JSON", async () => {
      await assertRejectsWithHardhatError(
        runEncodeArgs({ signature: "f(uint256[])", values: ["[1,2"] }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "[1,2",
          name: "values",
          reason:
            'uint256[] values must be written as JSON, with addresses, hex and strings quoted, like [1,"0x..."]',
        },
      );
    });

    it("throws when the signature is invalid", async () => {
      await assertRejectsWithHardhatError(
        runEncodeArgs({ signature: "f(unit256)", values: ["1"] }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "f(unit256)",
          name: "signature",
          reason:
            'unknown type "unit256"; write structs as tuples like (address,uint256), contracts as address, enums as uint8 and user-defined value types as their underlying type',
        },
      );
    });
  });
});
