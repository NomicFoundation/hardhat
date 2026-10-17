import type { FileChange } from "../../../../src/internal/builtin-plugins/watch/watch-session.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { mkdir, writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import {
  ChangeBatcher,
  isIgnoredPath,
  watchFiles,
} from "../../../../src/internal/builtin-plugins/watch/file-watcher.js";

async function waitFor(
  condition: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for the condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

describe("watch/file-watcher", () => {
  describe("isIgnoredPath", () => {
    const root = path.join(path.sep, "project");
    const artifacts = path.join(root, "artifacts");

    it("ignores the given directories and their contents", () => {
      assert.equal(isIgnoredPath(artifacts, [artifacts]), true);
      assert.equal(
        isIgnoredPath(path.join(artifacts, "A.json"), [artifacts]),
        true,
      );
    });

    it("doesn't ignore siblings that share a prefix", () => {
      assert.equal(
        isIgnoredPath(path.join(root, "artifacts-old", "A.json"), [artifacts]),
        false,
      );
    });

    it("ignores node_modules and .git anywhere", () => {
      assert.equal(
        isIgnoredPath(
          path.join(root, "contracts", "node_modules", "x.sol"),
          [],
        ),
        true,
      );
      assert.equal(isIgnoredPath(path.join(root, ".git", "HEAD"), []), true);
    });

    it("doesn't ignore sources", () => {
      assert.equal(
        isIgnoredPath(path.join(root, "contracts", "A.sol"), [artifacts]),
        false,
      );
    });
  });

  describe("ChangeBatcher", () => {
    it("reports the changes of a burst once, keeping each file's last change", async () => {
      const batches: FileChange[][] = [];
      const batcher = new ChangeBatcher(30, (changes) => batches.push(changes));

      batcher.add({ absolutePath: "/p/A.sol", type: "add" });
      batcher.add({ absolutePath: "/p/A.sol", type: "change" });
      batcher.add({ absolutePath: "/p/B.sol", type: "unlink" });

      await waitFor(() => batches.length > 0);

      assert.deepEqual(batches, [
        [
          { absolutePath: "/p/A.sol", type: "change" },
          { absolutePath: "/p/B.sol", type: "unlink" },
        ],
      ]);
    });

    it("reports nothing after cancel", async () => {
      const batches: FileChange[][] = [];
      const batcher = new ChangeBatcher(10, (changes) => batches.push(changes));

      batcher.add({ absolutePath: "/p/A.sol", type: "change" });
      batcher.cancel();
      await new Promise((resolve) => setTimeout(resolve, 50));

      assert.deepEqual(batches, []);
    });
  });

  describe("watchFiles", () => {
    const tmp = createTmpDir("watch-files", "test");

    it("reports changes to watched files, but not to ignored directories", async () => {
      const contracts = path.join(tmp.path, "contracts");
      const artifacts = path.join(contracts, "artifacts");
      await mkdir(artifacts);
      const source = path.join(contracts, "A.sol");
      await writeUtf8File(source, "// a");

      const batches: FileChange[][] = [];
      const watcher = watchFiles({
        paths: [contracts],
        ignoredDirectories: [artifacts],
        delayMs: 20,
        onChanges: (changes) => batches.push(changes),
      });

      try {
        // Give the watcher time to start, as chokidar doesn't report it
        await new Promise((resolve) => setTimeout(resolve, 300));

        await writeUtf8File(path.join(artifacts, "A.json"), "{}");
        await writeUtf8File(source, "// b");

        await waitFor(() =>
          batches.flat().some((change) => change.absolutePath === source),
        );

        assert.ok(
          batches
            .flat()
            .every((change) => !change.absolutePath.startsWith(artifacts)),
          "Changes in the ignored directory were reported",
        );
      } finally {
        await watcher.close();
      }
    });
  });
});
