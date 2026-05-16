import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { findClosestPackageRoot } from "@nomicfoundation/hardhat-utils/package";

import {
  createTmpDir,
  makeWorkspaceTmpDir,
  safeRemoveTmpDir,
} from "../src/fs.js";

describe("fs", () => {
  describe("makeWorkspaceTmpDir", () => {
    let workspaceRoot: string;
    before(async () => {
      const pkgRoot = await findClosestPackageRoot(import.meta.url);
      workspaceRoot = path.resolve(pkgRoot, "..", "..");
    });

    it("creates a directory inside <workspace-root>/tmp/", async () => {
      const dir = await makeWorkspaceTmpDir("unit");
      try {
        assert.ok(existsSync(dir), `expected ${dir} to exist`);
        const expectedParent = path.join(workspaceRoot, "tmp");
        assert.equal(path.dirname(dir), expectedParent);
        assert.match(path.basename(dir), /^unit-/);
      } finally {
        await safeRemoveTmpDir(dir);
      }
    });

    it("returns distinct paths for repeated calls with the same name hint", async () => {
      const a = await makeWorkspaceTmpDir("unit");
      const b = await makeWorkspaceTmpDir("unit");
      try {
        assert.notEqual(a, b);
      } finally {
        await safeRemoveTmpDir(a);
        await safeRemoveTmpDir(b);
      }
    });
  });

  describe("safeRemoveTmpDir", () => {
    it("removes an existing directory", async () => {
      const dir = await makeWorkspaceTmpDir("safe-remove");
      assert.ok(existsSync(dir), `expected ${dir} to exist before removal`);

      await safeRemoveTmpDir(dir);

      assert.ok(!existsSync(dir), `expected ${dir} to be removed`);
    });

    it("does not throw when called on a non-existent path", async () => {
      const dir = await makeWorkspaceTmpDir("safe-remove-nonexistent");
      await safeRemoveTmpDir(dir);

      await safeRemoveTmpDir(dir);
    });

    it("restores cwd before removing if cwd is inside the directory", async () => {
      const dir = await makeWorkspaceTmpDir("safe-remove-cwd");
      const originalCwd = process.cwd();

      try {
        process.chdir(dir);
        assert.equal(process.cwd(), dir);

        await safeRemoveTmpDir(dir);

        assert.notEqual(process.cwd(), dir);
        assert.ok(!existsSync(dir), `expected ${dir} to be removed`);
      } finally {
        if (process.cwd() !== originalCwd) {
          process.chdir(originalCwd);
        }
      }
    });
  });

  describe("createTmpDir", () => {
    describe('scope "test"', () => {
      const tmp = createTmpDir("scope-test-fresh", "test");
      const seenPaths: string[] = [];

      it("creates a dir before the first test runs", () => {
        assert.ok(existsSync(tmp.path), `expected ${tmp.path} to exist`);
        seenPaths.push(tmp.path);
      });

      it("creates a different dir for the second test, and removed the previous one", () => {
        assert.ok(existsSync(tmp.path), `expected ${tmp.path} to exist`);
        assert.ok(
          !seenPaths.includes(tmp.path),
          `expected a fresh path, got the previous one: ${tmp.path}`,
        );
        assert.ok(
          !existsSync(seenPaths[0]),
          `expected the previous test's dir ${seenPaths[0]} to be cleaned up`,
        );
        seenPaths.push(tmp.path);
      });

      after(() => {
        for (const p of seenPaths) {
          assert.ok(!existsSync(p), `${p} should have been cleaned up`);
        }
      });
    });

    describe('scope "describe"', () => {
      let sharedPath: string;

      describe("inner describe", () => {
        const tmp = createTmpDir("scope-describe-shared", "describe");

        it("creates one dir for the whole describe", () => {
          sharedPath = tmp.path;
          assert.ok(existsSync(sharedPath), `expected ${sharedPath} to exist`);
        });

        it("reuses the same dir across sibling tests", () => {
          assert.equal(tmp.path, sharedPath);
          assert.ok(
            existsSync(sharedPath),
            `expected ${sharedPath} to still exist`,
          );
        });
      });

      it("removes the shared dir after the inner describe completes", () => {
        assert.ok(
          !existsSync(sharedPath),
          `expected the shared dir ${sharedPath} to be cleaned up`,
        );
      });
    });

    describe(".path getter", () => {
      it("throws when accessed before the create hook has run", () => {
        const tmp = createTmpDir("never-run", "test");

        assert.throws(
          () => tmp.path,
          /accessed before the dir was created/,
          ".path should refuse access before beforeEach has populated it",
        );
      });
    });
  });
});
