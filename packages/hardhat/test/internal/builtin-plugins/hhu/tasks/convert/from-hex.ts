// cSpell:ignore 0xnothex
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

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
describe("hhu utils convert tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment(
      { plugins: [hhu] },
      {},
      process.cwd(),
    );
  });

  describe("from-hex", () => {
    async function runFromHex(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "convert", "from-hex"])
        .run(taskArguments);
    }

    it("converts a 0x-prefixed hex value to decimal", async () => {
      await runFromHex({ value: "0xff" });

      assert.deepEqual(capture.lines, ["255"]);
    });

    it("accepts values without the 0x prefix", async () => {
      await runFromHex({ value: "ff" });

      assert.deepEqual(capture.lines, ["255"]);
    });

    it("accepts uppercase hex digits", async () => {
      await runFromHex({ value: "0xFF" });

      assert.deepEqual(capture.lines, ["255"]);
    });

    it("converts values larger than 2^53 without losing precision", async () => {
      await runFromHex({ value: `0x${"f".repeat(64)}` });

      assert.deepEqual(capture.lines, [(2n ** 256n - 1n).toString()]);
    });

    it("throws when the value is not a valid hex string", async () => {
      await assertRejectsWithHardhatError(
        runFromHex({ value: "0xnothex" }),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_HEX_STRING,
        { value: "0xnothex" },
      );
    });

    it("throws when the value has no hex digits", async () => {
      await assertRejectsWithHardhatError(
        runFromHex({ value: "0x" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0x",
          name: "value",
          reason: "it must have at least one hex digit",
        },
      );
    });
  });
});
