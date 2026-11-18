import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { captureConsole } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("hhu utils constants tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
  });

  describe("zero-hash", () => {
    it("prints the zero hash", async () => {
      await hre.tasks.getTask(["utils", "constants", "zero-hash"]).run({});

      assert.deepEqual(capture.lines, [ZERO_HASH]);
    });
  });
});
