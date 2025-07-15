import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { ensureDir } from "../src/fs.js";
import { resolveFromRoot, shortenPath } from "../src/path.js";

describe("path", () => {
  describe("resolveFromRoot", () => {
    it("Should resolve an absolute path", () => {
      const root = "/root";
      const target = "/target";

      assert.equal(resolveFromRoot(root, target), target);
    });

    it("Should resolve a relative path", () => {
      const root = "/root";
      const target = "target";

      assert.equal(
        resolveFromRoot(root, target),
        path.resolve(path.join(root, target)),
      );
    });

    it("Should resolve a relative path with . and ..", () => {
      const root = "/root";
      const target = "./.././target";

      assert.equal(
        resolveFromRoot(root, target),
        path.resolve(path.join(root, target)),
      );
    });
  });

  describe("shortenPath", () => {
    let originalCwd: string;
    before(() => {
      originalCwd = process.cwd();
    });

    after(() => {
      process.chdir(originalCwd);
    });

    it("Should shorten a path that's inside the folder", () => {
      process.chdir(import.meta.dirname);

      assert.equal(shortenPath(import.meta.dirname), "." + path.sep);

      assert.equal(
        shortenPath(path.join(import.meta.dirname, "A.sol")),
        "." + path.sep + "A.sol",
      );

      assert.equal(
        shortenPath(path.join(import.meta.dirname, "a", "b", "A.sol")),
        "." + path.sep + path.join("a", "b", "A.sol"),
      );

      // Test that it works with a path.sep at the end
      assert.equal(
        shortenPath(path.join(import.meta.dirname, "a") + path.sep),
        "." + path.sep + "a",
      );
    });

    it("Should shorten a path that's not inside the folder", () => {
      process.chdir(path.join(import.meta.dirname, "fixture-projects"));

      assert.equal(
        shortenPath(path.join(import.meta.dirname, "nope")),
        path.join("..", "nope"),
      );

      assert.equal(
        shortenPath(path.join(import.meta.dirname)),
        ".." + path.sep,
      );
    });

    it("Shouldn't shorten a path that's not inside the folder whose path relative path would be longer", async () => {
      // We define a folder so nested that the relative path will be longer
      // than the absolute one, due to too many ".." in the path
      const cwd = path.join(
        import.meta.dirname,
        "fixture-projects",
        "fs",
        "shorten-path",
        ...Array(20).fill("a"),
      );
      await ensureDir(cwd);
      process.chdir(cwd);

      assert.equal(shortenPath(import.meta.dirname), import.meta.dirname);
    });
  });
});
