import type { PackageJson } from "../src/package.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { expectTypeOf } from "expect-type";

import {
  createFile,
  getRealPath,
  mkdir,
  writeJsonFile,
  writeUtf8File,
} from "../src/fs.js";
import {
  findClosestPackageJson,
  readClosestPackageJson,
  findClosestPackageRoot,
  findDependencyPackageJson,
} from "../src/package.js";

import { useTmpDir } from "./helpers/fs.js";

describe("package", () => {
  const getTmpDir = useTmpDir("package");

  describe("findClosestPackageJson", () => {
    it("Should find the closest package.json relative to import.meta.url", async () => {
      const expectedPath = path.resolve("package.json");
      const actualPath = await findClosestPackageJson(import.meta.url);

      assert.equal(actualPath, expectedPath);
    });

    it("Should find the closest package.json relative to a file", async () => {
      const expectedPath = path.join(getTmpDir(), "package.json");
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir", "file.js");
      await createFile(expectedPath);
      await createFile(fromPath);

      const actualPath = await findClosestPackageJson(fromPath);

      assert.equal(actualPath, expectedPath);
    });

    it("Should find the closest package.json relative to a directory", async () => {
      const expectedPath = path.join(getTmpDir(), "package.json");
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir");
      await createFile(expectedPath);
      await mkdir(fromPath);

      const actualPath = await findClosestPackageJson(fromPath);

      assert.equal(actualPath, expectedPath);
    });

    it("Should find the closest package.json relative to a directory when its within that directory", async () => {
      const expectedPath = path.join(getTmpDir(), "package.json");
      const fromPath = getTmpDir();
      await createFile(expectedPath);

      const actualPath = await findClosestPackageJson(fromPath);

      assert.equal(actualPath, expectedPath);
    });

    it("Should throw PackageJsonNotFoundError if no package.json is found", async () => {
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir");

      await assert.rejects(findClosestPackageJson(fromPath), {
        name: "PackageJsonNotFoundError",
        message: `No package.json found for ${fromPath}`,
      });
    });

    it("Should throw PackageJsonNotFoundError if the file url is malformed", async () => {
      await assert.rejects(findClosestPackageJson("file:///"), {
        name: "PackageJsonNotFoundError",
        message: `No package.json found for file:///`,
      });
    });
  });

  describe("readClosestPackageJson", () => {
    it("Should read the closest package.json relative to import.meta.url", async () => {
      const packageJson = await readClosestPackageJson(import.meta.url);

      expectTypeOf(packageJson).toEqualTypeOf<PackageJson>();
      assert.equal(packageJson.name, "@nomicfoundation/hardhat-utils");
    });

    it("Should read the closest package.json relative to a file", async () => {
      const packageJsonPath = path.join(getTmpDir(), "package.json");
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir", "file.js");
      await writeJsonFile(packageJsonPath, {
        name: "test-package",
      });
      await createFile(fromPath);

      const packageJson = await readClosestPackageJson(fromPath);

      expectTypeOf(packageJson).toEqualTypeOf<PackageJson>();
      assert.equal(packageJson.name, "test-package");
    });

    it("Should read the closest package.json relative to a directory", async () => {
      const packageJsonPath = path.join(getTmpDir(), "package.json");
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir");
      await writeJsonFile(packageJsonPath, {
        name: "test-package",
      });
      await createFile(fromPath);

      const packageJson = await readClosestPackageJson(fromPath);

      expectTypeOf(packageJson).toEqualTypeOf<PackageJson>();
      assert.equal(packageJson.name, "test-package");
    });

    it("Should throw PackageJsonNotFoundError if no package.json is found", async () => {
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir");

      await assert.rejects(readClosestPackageJson(fromPath), {
        name: "PackageJsonNotFoundError",
        message: `No package.json found for ${fromPath}`,
      });
    });

    it("Should throw PackageJsonNotFoundError if the file url is malformed", async () => {
      await assert.rejects(readClosestPackageJson("file:///"), {
        name: "PackageJsonNotFoundError",
        message: `No package.json found for file:///`,
      });
    });

    it("Should throw PackageJsonReadError if the package.json is malformed", async () => {
      const packageJsonPath = path.join(getTmpDir(), "package.json");
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir", "file.js");
      await writeUtf8File(packageJsonPath, "{");

      await assert.rejects(readClosestPackageJson(fromPath), {
        name: "PackageJsonReadError",
        message: `Failed to read package.json at ${packageJsonPath}`,
      });
    });
  });

  describe("findClosestPackageRoot", () => {
    it("Should find the package root relative to import.meta.url", async () => {
      const packageRoot = await findClosestPackageRoot(import.meta.url);

      assert.equal(packageRoot, path.resolve("."));
    });

    it("Should find the package root relative to a file", async () => {
      const packageJsonPath = path.join(getTmpDir(), "package.json");
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir", "file.js");
      await writeJsonFile(packageJsonPath, {
        name: "test-package",
      });
      await createFile(fromPath);

      const packageRoot = await findClosestPackageRoot(fromPath);

      assert.equal(packageRoot, getTmpDir());
    });

    it("Should find the package root relative to a directory", async () => {
      const packageJsonPath = path.join(getTmpDir(), "package.json");
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir");
      await writeJsonFile(packageJsonPath, {
        name: "test-package",
      });
      await createFile(fromPath);

      const packageRoot = await findClosestPackageRoot(fromPath);

      assert.equal(packageRoot, getTmpDir());
    });

    it("Should throw PackageJsonNotFoundError if no package.json is found", async () => {
      const fromPath = path.join(getTmpDir(), "subdir", "subsubdir");

      await assert.rejects(findClosestPackageRoot(fromPath), {
        name: "PackageJsonNotFoundError",
        message: `No package.json found for ${fromPath}`,
      });
    });
  });

  describe("findDependencyPackageJson", async () => {
    describe("Fixture project: find-dependency-packagejson", async () => {
      const fixtureProjectPath = await getRealPath(
        path.resolve(
          import.meta.dirname,
          "fixture-projects",
          "find-dependency-packagejson",
        ),
      );

      it("Should resolve non-scoped packages", async () => {
        const packageJsonPath = await findDependencyPackageJson(
          fixtureProjectPath,
          "a",
        );

        assert.equal(
          packageJsonPath,
          path.join(fixtureProjectPath, "node_modules/a/package.json"),
        );
      });

      it("Should work with and without trailing slashes", async () => {
        assert.equal(
          await findDependencyPackageJson(
            fixtureProjectPath.replace(/\/+$/, ""),
            "a",
          ),
          await findDependencyPackageJson(
            fixtureProjectPath.replace(/\/+$/, "") + "/",
            "a",
          ),
        );
      });

      it("Should resolve scoped packages", async () => {
        const packageJsonPath = await findDependencyPackageJson(
          fixtureProjectPath,
          "@scope/a",
        );

        assert.equal(
          packageJsonPath,
          path.join(fixtureProjectPath, "node_modules/@scope/a/package.json"),
        );
      });

      it("Shouldn't find non-existing packages", async () => {
        const packageJsonPath = await findDependencyPackageJson(
          fixtureProjectPath,
          "nope",
        );

        assert.equal(packageJsonPath, undefined);
      });

      it("Should resolve nested dependencies local to the node_modules", async () => {
        const packageJsonPath = await findDependencyPackageJson(
          path.join(fixtureProjectPath, "node_modules/@scope/a"),
          "a",
        );

        assert.equal(
          packageJsonPath,
          path.join(
            fixtureProjectPath,
            "node_modules/@scope/a/node_modules/a/package.json",
          ),
        );
      });

      it("Should resolve nested dependencies in an upper node_modules", async () => {
        const packageJsonPath = await findDependencyPackageJson(
          path.join(fixtureProjectPath, "node_modules/@scope/a"),
          "b",
        );

        assert.equal(
          packageJsonPath,
          path.join(fixtureProjectPath, "node_modules/b/package.json"),
        );
      });

      it("Should resolve symlinks", async () => {
        const packageJsonPath = await findDependencyPackageJson(
          path.join(fixtureProjectPath, "node_modules/b"),
          "a",
        );

        assert.equal(
          packageJsonPath,
          path.join(fixtureProjectPath, "node_modules/a/package.json"),
        );
      });
    });
  });
});
