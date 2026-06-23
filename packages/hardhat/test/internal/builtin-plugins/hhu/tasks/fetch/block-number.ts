import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { captureConsole } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

describe("hhu utils fetch tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({}, {}, process.cwd());
  });

  describe("block-number", () => {
    it("prints the latest block number of the default network", async () => {
      await hre.tasks.getTask(["utils", "fetch", "block-number"]).run({});

      assert.equal(capture.lines.length, 1);
      assert.match(capture.lines[0], /^\d+$/);
    });
  });
});
