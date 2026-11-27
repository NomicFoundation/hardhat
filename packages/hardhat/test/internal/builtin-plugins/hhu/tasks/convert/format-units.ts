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

  describe("format-units", () => {
    async function runFormatUnits(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "convert", "format-units"])
        .run(taskArguments);
    }

    it("formats with 18 decimals by default", async () => {
      await runFormatUnits({ value: 1500000000000000000n });

      assert.deepEqual(capture.lines, ["1.5"]);
    });

    it("formats with the given decimals", async () => {
      await runFormatUnits({ value: 1500000n, decimals: 6 });
      await runFormatUnits({ value: 1n, decimals: 6 });
      await runFormatUnits({ value: 15n, decimals: 0 });

      assert.deepEqual(capture.lines, ["1.5", "0.000001", "15"]);
    });

    it("prints whole amounts without decimal places", async () => {
      await runFormatUnits({ value: 1000000n, decimals: 6 });
      await runFormatUnits({ value: 0n, decimals: 6 });

      assert.deepEqual(capture.lines, ["1", "0"]);
    });

    it("formats negative values", async () => {
      await runFormatUnits({ value: -1500000n, decimals: 6 });

      assert.deepEqual(capture.lines, ["-1.5"]);
    });

    it("throws when the decimals are out of range", async () => {
      await assertRejectsWithHardhatError(
        runFormatUnits({ value: 1n, decimals: 256 }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: 256,
          name: "decimals",
          reason: "it must be between 0 and 255",
        },
      );

      await assertRejectsWithHardhatError(
        runFormatUnits({ value: 1n, decimals: -1 }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        { value: -1, name: "decimals", reason: "it must be between 0 and 255" },
      );
    });
  });
});
