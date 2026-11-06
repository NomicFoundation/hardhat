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
// Keccak itself is covered by the hardhat-utils tests; these tests only verify
// the task wiring and how the input is mapped to bytes.
describe("hhu utils hash tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment(
      { plugins: [hhu] },
      {},
      process.cwd(),
    );
  });

  describe("keccak", () => {
    async function runKeccak(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "hash", "keccak"]).run(taskArguments);
    }

    it("hashes a 0x-prefixed hex string as bytes", async () => {
      await runKeccak({ value: "0x" });
      await runKeccak({ value: "0X00" });
      await runKeccak({ value: "0xdeadBEEF" });

      assert.deepEqual(capture.lines, [
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
        "0xbc36789e7a1e281436464229828f817d6612f7b477d66591ff96a9e064bcc98a",
        "0xd4fd4e189132273036449fc9e11198c739161b4c0116a9a2dccdfa1c492006f1",
      ]);
    });

    it("hashes anything else as a utf8 string", async () => {
      await runKeccak({ value: "" });
      await runKeccak({ value: "hello" });
      await runKeccak({ value: "00" });
      await runKeccak({ value: "transfer(address,uint256)" });

      assert.deepEqual(capture.lines, [
        "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
        "0x1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8",
        "0xe3f0ae350ee09657933cd8202a4dd563c5af941f8054e6d7191e3246be378290",
        "0xa9059cbb2ab09eb219583f4a59a5d0623ade346d962bcd4e46b11da047c9049b",
      ]);
    });

    it("throws when a 0x-prefixed value is not a valid hex string", async () => {
      await assertRejectsWithHardhatError(
        runKeccak({ value: "0xzz" }),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_HEX_STRING,
        { value: "0xzz" },
      );
    });

    it("throws when a 0x-prefixed value has an odd number of hex digits", async () => {
      await assertRejectsWithHardhatError(
        runKeccak({ value: "0x123" }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0x123",
          name: "value",
          reason: "it must have an even number of hex digits",
        },
      );
    });
  });
});
