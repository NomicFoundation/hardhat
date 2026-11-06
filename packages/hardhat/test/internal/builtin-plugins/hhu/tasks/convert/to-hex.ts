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

  describe("to-hex", () => {
    async function runToHex(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "convert", "to-hex"])
        .run(taskArguments);
    }

    it("converts a number to hex", async () => {
      await runToHex({ value: 255n });

      assert.deepEqual(capture.lines, ["0xff"]);
    });

    it("converts zero to 0x0", async () => {
      await runToHex({ value: 0n });

      assert.deepEqual(capture.lines, ["0x0"]);
    });

    it("converts numbers larger than 2^53 without losing precision", async () => {
      await runToHex({ value: 2n ** 256n - 1n });

      assert.deepEqual(capture.lines, [`0x${"f".repeat(64)}`]);
    });

    it("throws when the value is negative", async () => {
      await assertRejectsWithHardhatError(
        runToHex({ value: -1n }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: -1n,
          name: "value",
          reason: "it must be a non-negative integer",
        },
      );
    });
  });
});
