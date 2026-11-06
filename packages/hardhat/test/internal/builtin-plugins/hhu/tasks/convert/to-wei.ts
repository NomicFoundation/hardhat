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

  describe("to-wei", () => {
    async function runToWei(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "convert", "to-wei"])
        .run(taskArguments);
    }

    it("converts an amount of ether to wei by default", async () => {
      await runToWei({ value: "1.5" });

      assert.deepEqual(capture.lines, ["1500000000000000000"]);
    });

    it("converts an amount of each unit to wei", async () => {
      await runToWei({ value: "1.5", unit: "ether" });
      await runToWei({ value: "1.5", unit: "gwei" });
      await runToWei({ value: "15", unit: "wei" });

      assert.deepEqual(capture.lines, [
        "1500000000000000000",
        "1500000000",
        "15",
      ]);
    });

    it("converts amounts with as many decimal places as the unit has", async () => {
      await runToWei({ value: "0.000000000000000001" });
      await runToWei({ value: "0.000000001", unit: "gwei" });

      assert.deepEqual(capture.lines, ["1", "1"]);
    });

    it("converts amounts larger than 2^53 wei without losing precision", async () => {
      await runToWei({ value: "123456789.123456789123456789" });

      assert.deepEqual(capture.lines, ["123456789123456789123456789"]);
    });

    it("converts negative amounts", async () => {
      await runToWei({ value: "-1.5" });

      assert.deepEqual(capture.lines, ["-1500000000000000000"]);
    });

    it("throws when the unit is not ether, gwei or wei", async () => {
      await assertRejectsWithHardhatError(
        runToWei({ value: "1", unit: "eth" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        { value: "eth", name: "unit", reason: "it must be ether, gwei or wei" },
      );
    });

    it("throws when the value is not a decimal number", async () => {
      await assertRejectsWithHardhatError(
        runToWei({ value: "1e18" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "1e18",
          name: "value",
          reason:
            "it must be a decimal number like 1.5, with at most 18 decimal places",
        },
      );
    });

    it("throws when the value has more decimal places than the unit", async () => {
      await assertRejectsWithHardhatError(
        runToWei({ value: "0.0000000000000000001" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0.0000000000000000001",
          name: "value",
          reason:
            "it must be a decimal number like 1.5, with at most 18 decimal places",
        },
      );

      await assertRejectsWithHardhatError(
        runToWei({ value: "1.5", unit: "wei" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "1.5",
          name: "value",
          reason:
            "it must be a decimal number like 1.5, with at most 0 decimal places",
        },
      );
    });
  });
});
