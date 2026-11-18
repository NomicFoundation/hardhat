import type { HardhatRuntimeEnvironment } from "../../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { captureConsole } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../../src/internal/hre-initialization.js";

describe("hhu utils fetch tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  const capture = captureConsole();

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
  });

  describe("chain-id", () => {
    it("prints the chain ID of the default network in decimal", async () => {
      await hre.tasks.getTask(["utils", "fetch", "chain-id"]).run({});

      assert.deepEqual(capture.lines, ["31337"]);
    });
  });
});
