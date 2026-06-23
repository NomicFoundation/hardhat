import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { captureConsole } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("hhu utils constants tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({}, {}, process.cwd());
  });

  describe("zero-address", () => {
    it("prints the zero address", async () => {
      await hre.tasks.getTask(["utils", "constants", "zero-address"]).run({});

      assert.deepEqual(capture.lines, [ZERO_ADDRESS]);
    });
  });
});
