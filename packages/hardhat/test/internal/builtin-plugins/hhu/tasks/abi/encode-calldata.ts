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

const ADDRESS = "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed";
const ONE =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

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

  describe("encode-calldata", () => {
    async function runEncodeCalldata(taskArguments: Record<string, unknown>) {
      await hre.tasks
        .getTask(["utils", "abi", "encode-calldata"])
        .run(taskArguments);
    }

    it("prints the selector followed by the encoded values", async () => {
      await runEncodeCalldata({
        signature: "transfer(address,uint256)",
        values: [ADDRESS, "1000"],
      });

      assert.deepEqual(capture.lines, [
        "0xa9059cbb0000000000000000000000005aaeb6053f3e94c9b9a09f33669435e7ef1beaed00000000000000000000000000000000000000000000000000000000000003e8",
      ]);
    });

    it("prints just the selector for a function without parameters", async () => {
      await runEncodeCalldata({ signature: "totalSupply()" });

      assert.deepEqual(capture.lines, ["0x18160ddd"]);
    });

    it("accepts a whole Solidity declaration", async () => {
      await runEncodeCalldata({
        signature:
          "function transfer(address to, uint amount) external returns (bool);",
        values: [ADDRESS, "1"],
      });

      assert.deepEqual(capture.lines, [
        "0xa9059cbb0000000000000000000000005aaeb6053f3e94c9b9a09f33669435e7ef1beaed" +
          ONE.slice(2),
      ]);
    });

    it("throws when the signature has no name", async () => {
      await assertRejectsWithHardhatError(
        runEncodeCalldata({ signature: "(uint256)", values: ["1"] }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "(uint256)",
          name: "signature",
          reason: "it must include a name",
        },
      );
    });
  });
});
