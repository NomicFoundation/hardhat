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

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// The hhu plugin is unreleased and de-registered from the builtin plugins, so
// it's injected explicitly to test the integrated (`hardhat utils ...`) path.
// The signature grammar is covered by the hardhat-utils abi tests.
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

      assert.deepEqual(capture.lines, [TRANSFER_TOPIC]);
    });

    it("prints the same topic for a whole Solidity declaration", async () => {
      await runSigEvent({
        signature:
          "event Transfer(address indexed from, address indexed to, uint value);",
      });

      assert.deepEqual(capture.lines, [TRANSFER_TOPIC]);
    });

    it("throws when the signature has no name", async () => {
      await assertRejectsWithHardhatError(
        runSigEvent({ signature: "(address,address,uint256)" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "(address,address,uint256)",
          name: "signature",
          reason: "it must include a name",
        },
      );
    });
  });
});
