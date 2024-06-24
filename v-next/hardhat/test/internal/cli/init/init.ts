import assert from "node:assert/strict";
import path from "node:path";
import { after, afterEach, beforeEach, describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  readJsonFile,
  readUtf8File,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";

import { initHardhat } from "../../../../src/internal/cli/init/init.js";
import { EMPTY_HARDHAT_CONFIG } from "../../../../src/internal/cli/init/project-creation.js";
import { getUserConfigPath } from "../../../../src/internal/cli/init/project-structure.js";
import { useFixtureProject } from "../../../helpers/project.js";

async function deleteHardhatConfigFile() {
  await remove(path.join(process.cwd(), "hardhat.config.ts"));
}

async function deletePackageJson() {
  await remove(path.join(process.cwd(), "package.json"));
}

const ORIGINAL_ENV = process.env;

describe("init", function () {
  beforeEach(function () {
    process.env = {};
  });

  afterEach(function () {
    process.env = ORIGINAL_ENV;
  });

  describe("init Hardhat in an empty folder", function () {
    after(async function () {
      await deleteHardhatConfigFile();
      await deletePackageJson();
    });

    useFixtureProject("cli/init/empty-folder");

    it("should create a package.json file and a hardhat.config.ts file", async function () {
      process.env.HARDHAT_CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG = "true";

      await initHardhat();

      assert.deepEqual(await readJsonFile("package.json"), {
        name: "hardhat-project",
        type: "module",
      });

      assert.deepEqual(
        await readUtf8File("hardhat.config.ts"),
        EMPTY_HARDHAT_CONFIG,
      );
    });
  });

  describe("init Hardhat in a folder where there is a valid package.json (esm package)", function () {
    after(async function () {
      await deleteHardhatConfigFile();
    });

    useFixtureProject("cli/init/valid-project-config");

    it("should create a hardhat.config.ts file", async function () {
      process.env.HARDHAT_CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG = "true";

      await initHardhat();

      assert.deepEqual(await readJsonFile("package.json"), {
        type: "module",
      });

      assert.deepEqual(
        await readUtf8File("hardhat.config.ts"),
        EMPTY_HARDHAT_CONFIG,
      );
    });
  });

  describe("init Hardhat in a folder where there is a package.json but it is not configured as esm", function () {
    describe("package.json is empty (not a esm package)", function () {
      useFixtureProject("cli/init/not-esm-project/missing-package-type");

      it("should throw an error because the project is not of type esm", async function () {
        process.env.HARDHAT_CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG = "true";

        await assert.rejects(
          async () => initHardhat(),
          new HardhatError(HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED),
        );
      });
    });

    describe("package.json has property 'type' !== 'module' (not a esm package)", function () {
      useFixtureProject("cli/init/not-esm-project/not-esm-type");

      it("should throw an error because the project is not of type esm", async function () {
        process.env.HARDHAT_CREATE_EMPTY_TYPESCRIPT_HARDHAT_CONFIG = "true";

        await assert.rejects(
          async () => initHardhat(),
          new HardhatError(HardhatError.ERRORS.GENERAL.ONLY_ESM_SUPPORTED),
        );
      });
    });
  });

  describe("Hardhat is already initialized", function () {
    useFixtureProject("cli/init/already-in-hh-project");

    it("should fail because there is already a hardhat.config.ts file", async function () {
      await assert.rejects(
        async () => initHardhat(),
        new HardhatError(
          HardhatError.ERRORS.GENERAL.HARDHAT_PROJECT_ALREADY_CREATED,
          {
            hardhatProjectRootPath: await getUserConfigPath(),
          },
        ),
      );
    });
  });

  describe("not inside an interactive shell", function () {
    it("should fail because the command is not executed inside an interactive shell", async function () {
      await assert.rejects(
        async () => initHardhat(),
        new HardhatError(HardhatError.ERRORS.GENERAL.NOT_IN_INTERACTIVE_SHELL),
      );
    });
  });
});
