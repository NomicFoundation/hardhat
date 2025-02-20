import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { exists } from "@nomicfoundation/hardhat-utils/fs";
import { useTmpDir } from "@nomicfoundation/hardhat-test-utils";

import { spawn } from "../../../../src/internal/cli/init/subprocess.js";

describe("spawn", () => {
  useTmpDir("spawn");

  it("should execute the command and wait for it to finish", async () => {
    // We delay the test.txt creation and then check if it exists. If spawn
    // didn't wait for the command to finish, test.txt wouldn't exist yet
    await spawn("sleep", ["0.01", "&&", "touch", "test.txt"], {
      shell: true,
    });
    assert.ok(await exists("test.txt"), "test.txt should exist already");
  });
  it("should throw if the command exits with a non-zero exit code", async () => {
    // eslint-disable-next-line no-restricted-syntax -- We expect a generic error here
    await assert.rejects(async () => {
      await spawn("test", ["-f", "test.txt"], {});
    });
  });
});
