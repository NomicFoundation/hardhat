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

  describe("sig", () => {
    async function runSig(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "abi", "sig"]).run(taskArguments);
    }

    it("prints the selector of a function signature", async () => {
      await runSig({ signature: "transfer(address,uint256)" });

      assert.deepEqual(capture.lines, ["0xa9059cbb"]);
    });

    it("throws when the signature is of an event", async () => {
      await assertRejectsWithHardhatError(
        runSig({ signature: "event Transfer(address,address,uint256)" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "event Transfer(address,address,uint256)",
          name: "signature",
          reason: "it's an event, not a function or error",
        },
      );
    });
  });
});
