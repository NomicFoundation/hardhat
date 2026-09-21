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

const INT256_MIN =
  "-57896044618658097711785492504343953926634992332820282019728792003956564819968";

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

  describe("min-value", () => {
    async function runMinValue(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "constants", "min-value"])
        .run(taskArguments);
    }

    // The default type is uint256, so both cases print 0
    it("prints 0 for any unsigned type, including the default one", async () => {
      await runMinValue({});
      await runMinValue({ type: "uint8" });

      assert.deepEqual(capture.lines, ["0", "0"]);
    });

    it("prints the minimum value of a signed type", async () => {
      await runMinValue({ type: "int8" });
      await runMinValue({ type: "int" });

      assert.deepEqual(capture.lines, ["-128", INT256_MIN]);
    });

    // The full list of invalid types is covered by the max-value tests, which
    // share the type parsing; this only checks that min-value validates too.
    it("throws when the type is not a valid Solidity integer type", async () => {
      await assertRejectsWithHardhatError(
        runMinValue({ type: "address" }),
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
