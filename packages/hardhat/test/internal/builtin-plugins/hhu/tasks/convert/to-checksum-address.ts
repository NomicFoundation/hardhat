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
// The EIP-55 algorithm itself is covered by the hardhat-utils tests; these
// tests only verify the task wiring and its error mapping.
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

  describe("to-checksum-address", () => {
    async function runToChecksumAddress(
      taskArguments: Record<string, unknown>,
    ) {
      await hre.tasks
        .getTask(["utils", "convert", "to-checksum-address"])
        .run(taskArguments);
    }

    it("prints the checksummed address", async () => {
      await runToChecksumAddress({
        address: "0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed",
      });

      assert.deepEqual(capture.lines, [
        "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
      ]);
    });

    it("throws when the value is not a valid address", async () => {
      await assertRejectsWithHardhatError(
        runToChecksumAddress({ address: "0x1234" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0x1234",
          name: "address",
          reason: "it must be a valid Ethereum address",
        },
      );
    });
  });
});
