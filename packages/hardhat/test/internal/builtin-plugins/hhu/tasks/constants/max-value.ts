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

const UINT256_MAX =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
describe("hhu utils constants tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment(
      { plugins: [hhu] },
      {},
      process.cwd(),
    );
  });

  describe("max-value", () => {
    async function runMaxValue(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "constants", "max-value"])
        .run(taskArguments);
    }

    it("prints the maximum value of an unsigned type, including the default one", async () => {
      await runMaxValue({});
      await runMaxValue({ type: "uint8" });

      assert.deepEqual(capture.lines, [UINT256_MAX, "255"]);
    });

    it("prints the maximum value of a signed type", async () => {
      await runMaxValue({ type: "int128" });

      assert.deepEqual(capture.lines, [
        "170141183460469231731687303715884105727",
      ]);
    });

    // Which type names are valid is covered by the parseIntType tests in
    // hardhat-utils; this only checks that max-value rejects the invalid ones.
    it("throws when the type is not a valid Solidity integer type", async () => {
      await assertRejectsWithHardhatError(
        runMaxValue({ type: "address" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "address",
          name: "type",
          reason: "it must be a Solidity integer type, like uint256 or int128",
        },
      );
    });
  });
});
