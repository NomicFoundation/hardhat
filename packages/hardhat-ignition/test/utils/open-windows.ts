import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { assert } from "chai";

import { open } from "../../src/internal/utils/open.js";

/**
 * Exercises `open` for real on Windows, through `cmd` and `start`, rather than
 * checking the command it builds. The opened file is a batch script that
 * writes a marker next to itself, so the marker only appears if `start`
 * received the whole path.
 */
describe("open on Windows", function () {
  let root: string;

  before(function () {
    if (process.platform !== "win32") {
      this.skip();
    }
  });

  beforeEach(async function () {
    root = await mkdtemp(path.join(tmpdir(), "hardhat-ignition-open-"));
  });

  afterEach(async function () {
    if (root !== undefined) {
      await rm(root, { recursive: true, force: true });
    }
  });

  for (const dirName of ["with space", "R&D", "a b&c"]) {
    it(`should open a file under a directory named "${dirName}"`, async function () {
      this.timeout(30_000);

      const dir = path.join(root, dirName);
      const probe = path.join(dir, "probe.cmd");
      const marker = path.join(dir, "marker.txt");

      await mkdir(dir);
      await writeFile(
        probe,
        // `%~dp0` is the script's own directory, with a trailing backslash
        ["@echo off", 'echo opened> "%~dp0marker.txt"', "exit"].join("\r\n"),
      );

      open(probe);

      assert.isTrue(
        await waitFor(() => existsSync(marker), 15_000),
        `Expected ${probe} to be opened, but ${marker} was never written`,
      );
    });
  }
});

async function waitFor(
  condition: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (condition()) {
      return true;
    }

    await sleep(100);
  }

  return condition();
}
