import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("hhu utils constants tasks", () => {
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

  describe("zeroAddress", () => {
    it("prints the zero address", async () => {
      await hre.tasks.getTask(["utils", "constants", "zeroAddress"]).run({});

      assert.deepEqual(logs, [ZERO_ADDRESS]);
    });
  });
});
