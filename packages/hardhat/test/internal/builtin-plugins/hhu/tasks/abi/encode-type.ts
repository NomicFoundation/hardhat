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

  describe("encode-type", () => {
    async function runEncodeType(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "abi", "encode-type"])
        .run(taskArguments);
    }

    it("encodes a negative signed integer", async () => {
      await runEncodeType({ type: "int256", value: "-5" });

      assert.deepEqual(capture.lines, [
        "0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb",
      ]);
    });

    it("encodes a hex integer", async () => {
      await runEncodeType({ type: "uint256", value: "0xff" });

      assert.deepEqual(capture.lines, [
        "0x00000000000000000000000000000000000000000000000000000000000000ff",
      ]);
    });

    it("encodes an array type written as JSON", async () => {
      await runEncodeType({ type: "address[]", value: `["${ADDRESS}"]` });

      assert.deepEqual(capture.lines, [
        "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000010000000000000000000000005aaeb6053f3e94c9b9a09f33669435e7ef1beaed",
      ]);
    });

    it("encodes a tuple type written as JSON", async () => {
      await runEncodeType({ type: "(uint256,bool)", value: "[1,true]" });

      assert.deepEqual(capture.lines, [ONE + ONE.slice(2)]);
    });

    it("throws when the type is unknown", async () => {
      await assertRejectsWithHardhatError(
        runEncodeType({ type: "foo", value: "1" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "foo",
          name: "type",
          reason:
            'unknown type "foo"; write structs as tuples like (address,uint256), contracts as address, enums as uint8 and user-defined value types as their underlying type',
        },
      );
    });

    it("throws when more than one type is given", async () => {
      await assertRejectsWithHardhatError(
        runEncodeType({ type: "uint256,bool", value: "1" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "uint256,bool",
          name: "type",
          reason: "it must be a single type, like uint256 or (address,bool)[]",
        },
      );
    });

    it("throws when the value is out of the type's range", async () => {
      await assertRejectsWithHardhatError(
        runEncodeType({ type: "uint8", value: "300" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "300",
          name: "value",
          reason:
            'The value provided for the parameter "[0]" is out of bounds for the type "uint8". Expected a value between 0 and 255.',
        },
      );
    });
  });
});
