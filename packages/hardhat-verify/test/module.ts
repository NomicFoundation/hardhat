import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { loadModule } from "../src/internal/module.js";

describe("utils", () => {
  describe("loadModule", () => {
    it("should load a js module from a relative path", async () => {
      const module = await loadModule(
        "./test/fixture-projects/load-module/test-module.js",
      );

      assert.equal(module.default, "This is a test module");
    });

    it("should load a ts module from a relative path", async () => {
      const module = await loadModule(
        "./test/fixture-projects/load-module/test-module.ts",
      );

      assert.equal(module.default, "This is a test module");
    });

    it("should load a js module from an absolute path", async () => {
      const module = await loadModule(
        path.join(
          process.cwd(),
          "./test/fixture-projects/load-module/test-module.js",
        ),
      );

      assert.equal(module.default, "This is a test module");
    });

    it("should load a ts module from an absolute path", async () => {
      const module = await loadModule(
        path.join(
          process.cwd(),
          "./test/fixture-projects/load-module/test-module.ts",
        ),
      );

      assert.equal(module.default, "This is a test module");
    });

    it("should throw an error if the module does not exist", async () => {
      let modulePath =
        "./test/fixture-projects/load-module/non-existent-module.js";
      await assertRejectsWithHardhatError(
        loadModule(modulePath),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.MODULE_NOT_FOUND,
        { modulePath },
      );

      await assertRejectsWithHardhatError(
        loadModule(pathToFileURL(modulePath).href),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.MODULE_NOT_FOUND,
        { modulePath: pathToFileURL(modulePath).href },
      );

      modulePath = "";
      await assertRejectsWithHardhatError(
        loadModule(modulePath),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.MODULE_NOT_FOUND,
        { modulePath },
      );
    });

    it("should throw an error if the module has a syntax error", async () => {
      const modulePath =
        "./test/fixture-projects/load-module/module-with-syntax-error.js";
      await assertRejectsWithHardhatError(
        loadModule(modulePath),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.MODULE_SYNTAX_ERROR,
        { modulePath, errorMessage: "Unexpected identifier 'syntax'" },
      );
    });

    it("should throw an error if the module has a runtime error", async () => {
      const modulePath =
        "./test/fixture-projects/load-module/module-with-runtime-error.js";
      await assertRejectsWithHardhatError(
        loadModule(modulePath),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.IMPORT_MODULE_FAILED,
        { modulePath, errorMessage: "This is a module with a runtime error." },
      );
    });

    it("should throw an error if the file is not a module", async () => {
      const modulePath = "./test/fixture-projects/load-module/not-a-module.txt";
      await assertRejectsWithHardhatError(
        loadModule(modulePath),
        HardhatError.ERRORS.HARDHAT_VERIFY.VALIDATION.IMPORT_MODULE_FAILED,
        {
          modulePath,
          errorMessage: `Unknown file extension \".txt\" for ${path.resolve(process.cwd(), modulePath)}`,
        },
      );
    });
  });
});
