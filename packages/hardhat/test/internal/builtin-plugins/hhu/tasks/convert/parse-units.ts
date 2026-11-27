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

  describe("parse-units", () => {
    async function runParseUnits(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "convert", "parse-units"])
        .run(taskArguments);
    }

    it("parses with 18 decimals by default", async () => {
      await runParseUnits({ value: "1.5" });

      assert.deepEqual(capture.lines, ["1500000000000000000"]);
    });

    it("parses with the given decimals", async () => {
      await runParseUnits({ value: "1.5", decimals: 6 });
      await runParseUnits({ value: "0.000001", decimals: 6 });
      await runParseUnits({ value: "15", decimals: 0 });
      await runParseUnits({ value: "1", decimals: 255 });

      assert.deepEqual(capture.lines, [
        "1500000",
        "1",
        "15",
        `1${"0".repeat(255)}`,
      ]);
    });

    it("parses negative amounts", async () => {
      await runParseUnits({ value: "-1.5", decimals: 6 });

      assert.deepEqual(capture.lines, ["-1500000"]);
    });

    it("throws when the value is not a decimal number", async () => {
      await assertRejectsWithHardhatError(
        runParseUnits({ value: "abc", decimals: 6 }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "abc",
          name: "value",
          reason:
            "it must be a decimal number like 1.5, with at most 6 decimal places",
        },
      );
    });

    it("throws when the value has more decimal places than the decimals", async () => {
      await assertRejectsWithHardhatError(
        runParseUnits({ value: "1.0000001", decimals: 6 }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "1.0000001",
          name: "value",
          reason:
            "it must be a decimal number like 1.5, with at most 6 decimal places",
        },
      );
    });

    it("throws when the decimals are out of range", async () => {
      await assertRejectsWithHardhatError(
        runParseUnits({ value: "1", decimals: 256 }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: 256,
          name: "decimals",
          reason: "it must be between 0 and 255",
        },
      );

      await assertRejectsWithHardhatError(
        runParseUnits({ value: "1", decimals: -1 }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        { value: -1, name: "decimals", reason: "it must be between 0 and 255" },
      );
    });
  });
});
