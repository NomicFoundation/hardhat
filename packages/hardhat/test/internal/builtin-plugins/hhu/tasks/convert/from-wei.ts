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

  describe("from-wei", () => {
    async function runFromWei(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "convert", "from-wei"])
        .run(taskArguments);
    }

    it("converts wei to ether by default", async () => {
      await runFromWei({ value: 1500000000000000000n });

      assert.deepEqual(capture.lines, ["1.5"]);
    });

    it("converts wei to each unit", async () => {
      await runFromWei({ value: 1500000000n, unit: "ether" });
      await runFromWei({ value: 1500000000n, unit: "gwei" });
      await runFromWei({ value: 1500000000n, unit: "wei" });

      assert.deepEqual(capture.lines, ["0.0000000015", "1.5", "1500000000"]);
    });

    it("prints whole amounts without decimal places", async () => {
      await runFromWei({ value: 10n ** 18n });
      await runFromWei({ value: 0n });

      assert.deepEqual(capture.lines, ["1", "0"]);
    });

    it("converts values larger than 2^53 without losing precision", async () => {
      await runFromWei({ value: 2n ** 256n - 1n });

      assert.deepEqual(capture.lines, [
        "115792089237316195423570985008687907853269984665640564039457.584007913129639935",
      ]);
    });

    it("converts negative values", async () => {
      await runFromWei({ value: -1500000000000000000n });

      assert.deepEqual(capture.lines, ["-1.5"]);
    });

    it("throws when the unit is not ether, gwei or wei", async () => {
      await assertRejectsWithHardhatError(
        runFromWei({ value: 1n, unit: "eth" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        { value: "eth", name: "unit", reason: "it must be ether, gwei or wei" },
      );
    });
  });
});
