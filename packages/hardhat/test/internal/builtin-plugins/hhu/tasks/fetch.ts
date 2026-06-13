import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

describe("hhu utils fetch tasks", () => {
  let hre: HardhatRuntimeEnvironment;

  let logs: string[] = [];
  const originalLog = console.log;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({}, {}, process.cwd());
  });

  beforeEach(() => {
    logs = [];
    console.log = (...args: unknown[]) => {
      logs.push(args.join(" "));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  describe("block-number", () => {
    it("prints the latest block number of the default network", async () => {
      await hre.tasks.getTask(["utils", "fetch", "block-number"]).run({});

      assert.equal(logs.length, 1);
      assert.match(logs[0], /^\d+$/);
    });
  });
});
