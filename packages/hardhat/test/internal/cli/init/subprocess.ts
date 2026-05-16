import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { exists } from "@nomicfoundation/hardhat-utils/fs";

import { spawn } from "../../../../src/internal/cli/init/subprocess.js";

describe("spawn", () => {
  const tmp = createTmpDir("spawn", "test");

  it("should execute the command and wait for it to finish", async () => {
    // We delay the test.txt creation and then check if it exists. If spawn
    // didn't wait for the command to finish, test.txt wouldn't exist yet
    await spawn("sleep", ["0.01", "&&", "touch", "test.txt"], {
      shell: true,
      cwd: tmp.path,
    });
    assert.ok(
      await exists(path.join(tmp.path, "test.txt")),
      "test.txt should exist already",
    );
  });
  it("should throw if the command exits with a non-zero exit code", async () => {
    // eslint-disable-next-line no-restricted-syntax -- We expect a generic error here
    await assert.rejects(async () => {
      await spawn("test", ["-f", "test.txt"], { cwd: tmp.path });
    });
  });
});
