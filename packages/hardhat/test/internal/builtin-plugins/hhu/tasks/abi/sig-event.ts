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

  describe("sig-event", () => {
    async function runSigEvent(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "abi", "sig-event"]).run(taskArguments);
    }

    it("prints the topic of an event signature", async () => {
      await runSigEvent({ signature: "Transfer(address,address,uint256)" });

      assert.deepEqual(capture.lines, [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
      ]);
    });

    it("throws when the signature is of a function", async () => {
      await assertRejectsWithHardhatError(
        runSigEvent({ signature: "function transfer(address,uint256)" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "function transfer(address,uint256)",
          name: "signature",
          reason: "it's a function, not an event",
        },
      );
    });

    it("throws when the event is anonymous", async () => {
      await assertRejectsWithHardhatError(
        runSigEvent({ signature: "event Ping() anonymous;" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "event Ping() anonymous;",
          name: "signature",
          reason: "anonymous events have no topic",
        },
      );
    });
  });
});
