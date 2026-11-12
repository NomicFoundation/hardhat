import { existsSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import { assert } from "chai";

import { open } from "../../src/internal/utils/open.js";

/**
 * Exercises `open` for real on Windows, through `cmd` and `start`, rather than
 * checking the command it builds.
 *
 * The opened file is a copy of `node.exe`, which `start` launches directly,
 * with no file association involved. `NODE_OPTIONS`, inherited through `cmd`
 * and `start`, makes it require a script that writes a marker next to the
 * executable and exits, so the marker only appears if `start` received the
 * whole path.
 *
 * Earlier probes depended on how Windows handles a file type, which is not what
 * is under test: a batch file is run through a second `cmd /c`, which strips the
 * quotes from a path containing `&` (as double-clicking one in Explorer does),
 * and `.js` files are not run by Windows Script Host on the CI runners.
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
      // The probe writes its marker just before exiting, and Windows keeps a
      // running executable locked, so the first attempts can fail with EPERM
      await rm(root, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100,
      });
    }
  });

  for (const dirName of ["with space", "R&D", "a b&c"]) {
    it(`should open a file under a directory named "${dirName}"`, async function () {
      this.timeout(30_000);

      const dir = path.join(root, dirName);
      const probe = path.join(dir, "probe.exe");
      const marker = path.join(dir, "marker.txt");
      const writer = path.join(root, "write-marker.cjs");

      await mkdir(dir);
      await copyFile(process.execPath, probe);
      await writeFile(
        writer,
        [
          'const path = require("node:path");',
          'require("node:fs").writeFileSync(path.join(path.dirname(process.execPath), "marker.txt"), "opened");',
          "process.exit(0);",
        ].join("\n"),
      );

      // Forward slashes, unquoted: inside quotes `NODE_OPTIONS` treats a
      // backslash as an escape. The temporary root contains no spaces.
      const previousNodeOptions = process.env.NODE_OPTIONS;
      process.env.NODE_OPTIONS = `--require ${writer.replaceAll("\\", "/")}`;
      try {
        open(probe);
      } finally {
        if (previousNodeOptions === undefined) {
          delete process.env.NODE_OPTIONS;
        } else {
          process.env.NODE_OPTIONS = previousNodeOptions;
        }
      }

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
