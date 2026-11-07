import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { createTmpDir } from "@nomicfoundation/hardhat-test-utils";
import { mkdir, writeUtf8File } from "@nomicfoundation/hardhat-utils/fs";

import { detectMissingTsExtension } from "../../../../src/internal/cli/error-handling/missing-ts-extension-error.js";

/**
 * Creates an error like the one Node.js throws when an ESM import can't be
 * resolved to a file.
 */
function createModuleNotFoundError(
  importPath: string,
  importerPath: string,
): Error {
  return Object.assign(
    new Error(
      `Cannot find module '${importPath}' imported from ${importerPath}`,
    ),
    { code: "ERR_MODULE_NOT_FOUND" },
  );
}

describe("missing-ts-extension-error", () => {
  describe("detectMissingTsExtension", () => {
    const project = createTmpDir("missing-ts-extension-error", "describe");

    before(async () => {
      await writeUtf8File(path.join(project.path, "helper.ts"), "");
      await mkdir(path.join(project.path, "node_modules", "pkg"));
      await writeUtf8File(
        path.join(project.path, "node_modules", "pkg", "helper.ts"),
        "",
      );
    });

    it("detects a .js import of an existing TypeScript file", async () => {
      const error = createModuleNotFoundError(
        path.join(project.path, "helper.js"),
        path.join(project.path, "main.ts"),
      );

      assert.deepEqual(await detectMissingTsExtension(error), {
        importPath: path.join(project.path, "helper.js"),
        importerPath: path.join(project.path, "main.ts"),
        suggestedPath: path.join(project.path, "helper.ts"),
      });
    });

    it("detects it in the cause chain", async () => {
      const cause = createModuleNotFoundError(
        path.join(project.path, "helper.js"),
        path.join(project.path, "main.ts"),
      );
      const error = new Error("Failed to import the module", { cause });

      assert.deepEqual(await detectMissingTsExtension(error), {
        importPath: path.join(project.path, "helper.js"),
        importerPath: path.join(project.path, "main.ts"),
        suggestedPath: path.join(project.path, "helper.ts"),
      });
    });

    it("ignores a .js import without a TypeScript file", async () => {
      const error = createModuleNotFoundError(
        path.join(project.path, "missing.js"),
        path.join(project.path, "main.ts"),
      );

      assert.equal(await detectMissingTsExtension(error), undefined);
    });

    it("ignores an import with another extension", async () => {
      const error = createModuleNotFoundError(
        path.join(project.path, "helper.mjs"),
        path.join(project.path, "main.ts"),
      );

      assert.equal(await detectMissingTsExtension(error), undefined);
    });

    it("ignores an import of a file in node_modules", async () => {
      const error = createModuleNotFoundError(
        path.join(project.path, "node_modules", "pkg", "helper.js"),
        path.join(project.path, "main.ts"),
      );

      assert.equal(await detectMissingTsExtension(error), undefined);
    });

    it("ignores an import from a file in node_modules", async () => {
      const error = createModuleNotFoundError(
        path.join(project.path, "helper.js"),
        path.join(project.path, "node_modules", "pkg", "main.ts"),
      );

      assert.equal(await detectMissingTsExtension(error), undefined);
    });

    it("ignores an error with the same message and another code", async () => {
      const error = Object.assign(
        new Error(
          `Cannot find module '${path.join(project.path, "helper.js")}' imported from ${path.join(project.path, "main.ts")}`,
        ),
        { code: "ERR_UNKNOWN" },
      );

      assert.equal(await detectMissingTsExtension(error), undefined);
    });

    it("ignores an unrelated error", async () => {
      const error = new Error("something else went wrong");

      assert.equal(await detectMissingTsExtension(error), undefined);
    });
  });
});
