import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { exists, remove } from "@ignored/hardhat-vnext-utils/fs";
import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

describe("hardhat-typechain", () => {
  describe("generate types from contracts", () => {
    const projectFolder = "generate-types";

    useFixtureProject(projectFolder);

    before(async () => {
      await remove(`${process.cwd()}/types`);
    });

    it("should generate the types", async () => {
      const hardhatConfig = await import(
        // eslint-disable-next-line import/no-relative-packages -- allow for fixture projects
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);

      await hre.tasks.getTask("clean").run();

      await hre.tasks.getTask("compile").run({});

      assert.equal(await exists(`${process.cwd()}/types`), true);
    });
  });

  describe("typechain should not generate types during compilation", () => {
    describe("when the configuration property dontOverrideCompile is set to true", () => {
      const projectFolder = "skip-type-generation";

      useFixtureProject(projectFolder);

      it("should not generate the types", async () => {
        const hardhatConfig = await import(
          // eslint-disable-next-line import/no-relative-packages -- allow for fixture projects
          `./fixture-projects/${projectFolder}/hardhat.config.js`
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        assert.equal(await exists(`${process.cwd()}/types`), false);

        await hre.tasks.getTask("clean").run();

        await hre.tasks.getTask("compile").run();

        assert.equal(await exists(`${process.cwd()}/types`), false);
      });
    });

    describe("when the flag --no-typechain is passed", () => {
      const projectFolder = "generate-types";

      useFixtureProject(projectFolder);

      before(async () => {
        await remove(`${process.cwd()}/types`);
      });

      it("should not generate the types", async () => {
        const hardhatConfig = await import(
          // eslint-disable-next-line import/no-relative-packages -- allow for fixture projects
          `./fixture-projects/${projectFolder}/hardhat.config.js`
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        hre.globalOptions.noTypechain = true;

        assert.equal(await exists(`${process.cwd()}/types`), false);

        await hre.tasks.getTask("clean").run();

        await hre.tasks.getTask("compile").run();

        assert.equal(await exists(`${process.cwd()}/types`), false);
      });
    });
  });

  describe("nothing to generate, no contract is compiled", () => {
    const projectFolder = "nothing-to-generate";

    useFixtureProject(projectFolder);

    before(async () => {
      await remove(`${process.cwd()}/types`);
    });

    it("should not generate the types", async () => {
      const hardhatConfig = await import(
        // eslint-disable-next-line import/no-relative-packages -- allow for fixture projects
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);

      await hre.tasks.getTask("clean").run();

      await hre.tasks.getTask("compile").run({});

      assert.equal(await exists(`${process.cwd()}/types`), false);
    });
  });

  describe("generate types from contracts in a custom output directory", () => {
    const projectFolder = "custom-out-dir";

    useFixtureProject(projectFolder);

    before(async () => {
      await remove(`${process.cwd()}/custom-types`);
    });

    it("should generate the types", async () => {
      const hardhatConfig = await import(
        // eslint-disable-next-line import/no-relative-packages -- allow for fixture projects
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);
      assert.equal(await exists(`${process.cwd()}/custom-types`), false);

      await hre.tasks.getTask("clean").run();

      await hre.tasks.getTask("compile").run({});

      assert.equal(await exists(`${process.cwd()}/custom-types`), true);
      assert.equal(await exists(`${process.cwd()}/types`), false);
    });
  });
});
