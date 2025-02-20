import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import {
  exists,
  readUtf8File,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";

describe("hardhat-typechain", () => {
  describe("check that types are generated correctly", () => {
    const projectFolder = "generate-types";

    useFixtureProject(projectFolder);

    before(async () => {
      await remove(`${process.cwd()}/types`);
    });

    it("should generate the types", async () => {
      // Check that the types are generated with the expected addition of the "/index.js" extensions
      // and the v3 modules

      const hardhatConfig = await import(
        // eslint-disable-next-line import/no-relative-packages -- allow for fixture projects
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);

      await hre.tasks.getTask("clean").run();

      await hre.tasks.getTask("compile").run();

      const content = await readUtf8File(
        path.join(process.cwd(), "types", "ethers-contracts", "hardhat.d.ts"),
      );

      // The overload target the v3 hardhat ethers package
      assert.equal(
        content.includes(
          `declare module "@nomicfoundation/hardhat-ethers/types" {`,
        ),
        true,
      );

      // The import should be from the v3 hardhat ethers package
      assert.equal(
        content.includes(`from "@nomicfoundation/hardhat-ethers/types";`),
        true,
      );

      // A relative import should have the ".js" extension
      assert.equal(
        content.includes(`import * as Contracts from "./index.js"`),
        true,
      );

      // The import from a npm package should have ".js" extensions
      assert.equal(content.includes(`import { ethers } from 'ethers'`), true);

      // Check that the types for the contract are generated
      assert.equal(
        await exists(
          `${process.cwd()}/types/ethers-contracts/factories/A__factory.ts`,
        ),
        true,
      );
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
          {
            noTypechain: true,
          },
        );

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

      await hre.tasks.getTask("compile").run();

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

      await hre.tasks.getTask("compile").run();

      assert.equal(await exists(`${process.cwd()}/custom-types`), true);
      assert.equal(await exists(`${process.cwd()}/types`), false);
    });
  });
});
