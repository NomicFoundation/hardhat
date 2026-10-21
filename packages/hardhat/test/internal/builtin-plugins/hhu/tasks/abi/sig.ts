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
// The signature grammar is covered by the signature parser tests.
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

    it("prints the same selector for a whole Solidity declaration", async () => {
      await runSig({
        signature:
          "function transfer(address to, uint amount) external returns (bool);",
      });

      assert.deepEqual(capture.lines, ["0xa9059cbb"]);
    });

    it("prints the selector of a signature with a tuple", async () => {
      await runSig({
        signature:
          "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))",
      });

      assert.deepEqual(capture.lines, ["0x414bf389"]);
    });

    it("prints the selector of an error signature", async () => {
      await runSig({ signature: "error Error(string)" });

      assert.deepEqual(capture.lines, ["0x08c379a0"]);
    });

    it("throws when the signature has no name", async () => {
      await assertRejectsWithHardhatError(
        runSig({ signature: "(address,uint256)" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "(address,uint256)",
          name: "signature",
          reason: "it must include a name",
        },
      );
    });

    it("throws when the signature is invalid", async () => {
      await assertRejectsWithHardhatError(
        runSig({ signature: "transfer(address,unit256)" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "transfer(address,unit256)",
          name: "signature",
          reason: 'unknown type "unit256"',
        },
      );
    });
  });
});
