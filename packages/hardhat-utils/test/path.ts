import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { ensureDir } from "../src/fs.js";
import { resolveFromRoot, sanitizeFilename, shortenPath } from "../src/path.js";

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

  describe("sanitizeFilename", () => {
    it("Should pass through names that are already filesystem-safe", () => {
      assert.equal(sanitizeFilename("foo"), "foo");
      assert.equal(sanitizeFilename("foo bar 123"), "foo bar 123");
      assert.equal(sanitizeFilename(".foo"), ".foo");
      assert.equal(sanitizeFilename("a.b.c"), "a.b.c");
      assert.equal(sanitizeFilename("hello-world_42"), "hello-world_42");
    });

    it('Should strip the reserved characters <>:"/\\|?*', () => {
      assert.equal(sanitizeFilename("a<b>c"), "abc");
      assert.equal(sanitizeFilename('a"b'), "ab");
      assert.equal(sanitizeFilename("a:b"), "ab");
      assert.equal(sanitizeFilename("a/b"), "ab");
      assert.equal(sanitizeFilename("a\\b"), "ab");
      assert.equal(sanitizeFilename("a|b"), "ab");
      assert.equal(sanitizeFilename("a?b"), "ab");
      assert.equal(sanitizeFilename("a*b"), "ab");
      assert.equal(sanitizeFilename('<>:"/\\|?*'), "_");
    });

    it("Should strip ASCII control characters", () => {
      assert.equal(sanitizeFilename("a\x00b"), "ab");
      assert.equal(sanitizeFilename("a\x1fb"), "ab");
      assert.equal(sanitizeFilename("a\x7fb"), "ab");
      assert.equal(sanitizeFilename("a\tb\nc\rd"), "abcd");
    });

    it("Should strip trailing dots and trailing whitespace", () => {
      assert.equal(sanitizeFilename("foo."), "foo");
      assert.equal(sanitizeFilename("foo..."), "foo");
      assert.equal(sanitizeFilename("foo "), "foo");
      assert.equal(sanitizeFilename("foo   "), "foo");
      assert.equal(sanitizeFilename("foo. . ."), "foo");
    });

    it("Should preserve leading whitespace and inner dots", () => {
      assert.equal(sanitizeFilename(" foo"), " foo");
      assert.equal(sanitizeFilename("a.b.c"), "a.b.c");
      assert.equal(sanitizeFilename("..foo"), "..foo");
    });

    it('Should map literal "." and ".." to the placeholder', () => {
      assert.equal(sanitizeFilename("."), "_");
      assert.equal(sanitizeFilename(".."), "_");
    });

    it("Should fall back to the placeholder for empty input or input that strips to empty", () => {
      assert.equal(sanitizeFilename(""), "_");
      assert.equal(sanitizeFilename("   "), "_");
      assert.equal(sanitizeFilename("..."), "_");
      assert.equal(sanitizeFilename("///"), "_");
    });

    it("Should flatten path-traversal attempts into a single component", () => {
      assert.equal(sanitizeFilename("../etc/passwd"), "..etcpasswd");
      assert.equal(sanitizeFilename("/abs/path"), "abspath");
      assert.equal(sanitizeFilename("a/b/c"), "abc");
      assert.equal(
        sanitizeFilename("..\\windows\\system32"),
        "..windowssystem32",
      );
    });

    it("Should avoid Windows reserved device names", () => {
      assert.equal(sanitizeFilename("CON"), "CON_");
      assert.equal(sanitizeFilename("nul"), "nul_");
      assert.equal(sanitizeFilename("COM1"), "COM1_");
      assert.equal(sanitizeFilename("LPT9"), "LPT9_");
      assert.equal(sanitizeFilename("CON.txt"), "CON_.txt");
      assert.equal(sanitizeFilename("com1.log"), "com1_.log");
    });

    it("Should avoid Windows reserved device names with superscript digits", () => {
      assert.equal(sanitizeFilename("COM¹"), "COM¹_");
      assert.equal(sanitizeFilename("COM²"), "COM²_");
      assert.equal(sanitizeFilename("COM³.log"), "COM³_.log");
      assert.equal(sanitizeFilename("LPT¹"), "LPT¹_");
      assert.equal(sanitizeFilename("LPT²"), "LPT²_");
      assert.equal(sanitizeFilename("LPT³.txt"), "LPT³_.txt");
    });

    it("Should preserve names that only contain Windows reserved device names as substrings", () => {
      assert.equal(sanitizeFilename("CONTRACT"), "CONTRACT");
      assert.equal(sanitizeFilename("XCOM1"), "XCOM1");
      assert.equal(sanitizeFilename("LPT10"), "LPT10");
      assert.equal(sanitizeFilename("NUL-device"), "NUL-device");
    });
  });
});
