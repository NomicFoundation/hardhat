import type { HardhatRuntimeEnvironment } from "../../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { createHardhatRuntimeEnvironment } from "../../../../../src/internal/hre-initialization.js";

describe("hhu utils convert tasks", () => {
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

  describe("pad", () => {
    async function runPad(taskArguments: Record<string, unknown>) {
      await hre.tasks.getTask(["utils", "convert", "pad"]).run(taskArguments);
    }

    it("pads to the left to 32 bytes by default", async () => {
      await runPad({ value: "ff" });

      assert.deepEqual(logs, [
        "0x00000000000000000000000000000000000000000000000000000000000000ff",
      ]);
    });

    it("accepts values with the 0x prefix", async () => {
      await runPad({ value: "0xff", length: 8 });

      assert.deepEqual(logs, ["0x00000000000000ff"]);
    });

    it("pads to the left when the left flag is used", async () => {
      await runPad({ value: "ff", length: 8, left: true });

      assert.deepEqual(logs, ["0x00000000000000ff"]);
    });

    it("pads to the right when the right flag is used", async () => {
      await runPad({ value: "0xff", length: 4, right: true });

      assert.deepEqual(logs, ["0xff000000"]);
    });

    it("throws when both the left and right flags are used", async () => {
      await assertRejectsWithHardhatError(
        runPad({ value: "ff", left: true, right: true }),
        HardhatError.ERRORS.CORE.ARGUMENTS.MUTUALLY_EXCLUSIVE_OPTIONS,
        { optionA: "left", optionB: "right" },
      );
    });

    it("throws when the value is not a valid hex string", async () => {
      await assertRejectsWithHardhatError(
        runPad({ value: "0xnothex" }),
        HardhatError.ERRORS.CORE.GENERAL.INVALID_HEX_STRING,
        { value: "0xnothex" },
      );
    });

    it("throws when the value is longer than the target length", async () => {
      await assertRejectsWithHardhatError(
        runPad({ value: "0xffffff", length: 2 }),
        HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE,
        {
          value: "0xffffff",
          name: "value",
          reason: "it's longer than the target length of 2 bytes",
        },
      );
    });
  });
});
