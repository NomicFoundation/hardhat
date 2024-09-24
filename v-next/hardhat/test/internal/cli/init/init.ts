import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  readJsonFile,
  readUtf8File,
  remove,
} from "@ignored/hardhat-vnext-utils/fs";
import { findClosestPackageRoot } from "@ignored/hardhat-vnext-utils/package";
import {
  assertRejectsWithHardhatError,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";

import { initHardhat } from "../../../../src/internal/cli/init/init.js";
import { findClosestHardhatConfig } from "../../../../src/internal/config-loading.js";

async function deleteHardhatConfigFile() {
  await remove(path.join(process.cwd(), "hardhat.config.ts"));
}

async function deletePackageJson() {
  await remove(path.join(process.cwd(), "package.json"));
}

describe("init", function () {
  let emptyHardhatConfig: string;

  before(async () => {
    const packageRoot = await findClosestPackageRoot(import.meta.url);
    const pathToEmptyTypescriptTemplate = path.join(
      packageRoot,
      "templates",
      "empty-typescript",
    );
    emptyHardhatConfig = await readUtf8File(
      path.join(pathToEmptyTypescriptTemplate, "hardhat.config.ts"),
    );
  });

  describe("init Hardhat in an empty folder", function () {
    after(async function () {
      await deleteHardhatConfigFile();
      await deletePackageJson();
    });

    useFixtureProject("cli/init/empty-folder");

    it("should create a package.json file and a hardhat.config.ts file", async function () {
      await initHardhat({
        template: "empty-typescript",
        workspace: process.cwd(),
        force: false,
        install: false,
      });

      assert.deepEqual(await readJsonFile("package.json"), {
        name: "hardhat-project",
        type: "module",
      });

      assert.deepEqual(
        await readUtf8File("hardhat.config.ts"),
        emptyHardhatConfig,
      );
    });
  });

  describe("init Hardhat in a folder where there is a valid package.json (esm package)", function () {
    after(async function () {
      await deleteHardhatConfigFile();
    });

    useFixtureProject("cli/init/valid-project-config");

    it("should create a hardhat.config.ts file", async function () {
      await initHardhat({
        template: "empty-typescript",
        workspace: process.cwd(),
        force: false,
        install: false,
      });

      assert.deepEqual(await readJsonFile("package.json"), {
        type: "module",
      });

      assert.deepEqual(
        await readUtf8File("hardhat.config.ts"),
        emptyHardhatConfig,
      );
    });
  });

  describe("init Hardhat in a folder where there is a package.json but it is not configured as esm", function () {
    describe("package.json is empty (not a esm package)", function () {
      useFixtureProject("cli/init/not-esm-project/missing-package-type");

      it("should throw an error because the project is not of type esm", async function () {
        await assertRejectsWithHardhatError(
          async () =>
            initHardhat({
              template: "empty-typescript",
              workspace: process.cwd(),
              force: false,
              install: false,
            }),
          HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED,
          {},
        );
      });
    });

    describe("package.json has property 'type' !== 'module' (not a esm package)", function () {
      useFixtureProject("cli/init/not-esm-project/not-esm-type");

      it("should throw an error because the project is not of type esm", async function () {
        await assertRejectsWithHardhatError(
          async () =>
            initHardhat({
              template: "empty-typescript",
              workspace: process.cwd(),
              force: false,
              install: false,
            }),
          HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED,
          {},
        );
      });
    });
  });

  describe("Hardhat is already initialized", function () {
    useFixtureProject("cli/init/already-in-hh-project");

    it("should fail because there is already a hardhat.config.ts file", async function () {
      await assertRejectsWithHardhatError(
        async () =>
          initHardhat({
            template: "empty-typescript",
            workspace: process.cwd(),
            force: false,
            install: false,
          }),
        HardhatError.ERRORS.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
        {
          hardhatProjectRootPath: await findClosestHardhatConfig(),
        },
      );
    });
  });

  describe("not inside an interactive shell", function () {
    it("should fail because the command is not executed inside an interactive shell", async function () {
      if (process.platform === "win32") {
        // Test for windows CI
        await assertRejectsWithHardhatError(
          async () => initHardhat(),
          HardhatError.ERRORS.GENERAL.NOT_INSIDE_PROJECT_ON_WINDOWS,
          {},
        );
      } else {
        // Test for all others CI
        await assertRejectsWithHardhatError(
          async () => initHardhat(),
          HardhatError.ERRORS.GENERAL.NOT_IN_INTERACTIVE_SHELL,
          {},
        );
      }
    });
  });
});
