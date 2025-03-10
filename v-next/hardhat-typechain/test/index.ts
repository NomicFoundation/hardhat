import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";

import assert from "node:assert/strict";
import path from "node:path";
import { before, beforeEach, describe, it } from "node:test";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import {
  exists,
  readUtf8File,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

// Read the contract factory from the generated types
async function readContractFactory(contractName: string) {
  const potentialPaths = [
    `${process.cwd()}/types/ethers-contracts/factories/${contractName}__factory.ts`,
    `${process.cwd()}/types/ethers-contracts/factories/${contractName}.sol/${contractName}__factory.ts`,
  ];
  for (const potentialPath of potentialPaths) {
    if (await exists(potentialPath)) {
      return readUtf8File(potentialPath);
    }
  }
  return undefined;
}

// Check the contract is typed in hardhat.d.ts
function isContractTyped(typeFileContents: string, contractName: string) {
  const lookupStrings = [
    `getContractFactory(name: '${contractName}'`,
    `getContractAt(name: '${contractName}'`,
    `deployContract(name: '${contractName}'`,
  ];
  for (const lookupString of lookupStrings) {
    if (!typeFileContents.includes(lookupString)) {
      return false;
    }
  }
  return true;
}

describe("hardhat-typechain", () => {
  describe("check that types are generated correctly", () => {
    const projectFolder = "generate-types";
    let hre: HardhatRuntimeEnvironment;
    let hardhatConfig: any;

    useFixtureProject(projectFolder);

    beforeEach(async () => {
      await remove(`${process.cwd()}/types`);

      hardhatConfig = await import(
        // eslint-disable-next-line import/no-relative-packages -- allow for fixture projects
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);

      await hre.tasks.getTask("clean").run();
    });

    it("should generate the types for the `hardhat.d.ts` file", async () => {
      await hre.tasks.getTask("compile").run();

      // Check that the types are generated with the expected addition of the "/index.js" extensions
      // and the v3 modules

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

      for (const contractName of ["A", "B"]) {
        assert.notEqual(await readContractFactory(contractName), undefined);
        assert.equal(isContractTyped(content, contractName), true);
      }
    });

    it("should generated types for the contracts and add the support for the `attach` method", async () => {
      await hre.tasks.getTask("compile").run();

      const content = await readContractFactory("A");

      if (content === undefined) {
        throw new Error("Factory for A.sol not found");
      }

      // The "Addressable" type should be imported
      assert.equal(
        content.includes(`import type { Addressable } from "ethers";`),
        true,
      );

      // The "attach" method should be added to the factory
      assert.equal(
        content.includes(`override attach(address: string | Addressable): A {`),
        true,
      );
    });

    it("doesnt lose types when compiling a subset of the contracts", async () => {
      // First: compile only A.sol. Only A should be typed
      await hre.tasks.getTask("compile").run({ files: ["contracts/A.sol"] });

      assert.notEqual(await readContractFactory("A"), undefined);
      assert.equal(await readContractFactory("B"), undefined);

      let content = await readUtf8File(
        path.join(process.cwd(), "types", "ethers-contracts", "hardhat.d.ts"),
      );

      assert.equal(isContractTyped(content, "A"), true);
      assert.equal(isContractTyped(content, "B"), false);

      // Second: compile only B.sol. Both A and B should be typed
      await hre.tasks.getTask("compile").run({ files: ["contracts/B.sol"] });

      assert.notEqual(await readContractFactory("A"), undefined);
      assert.notEqual(await readContractFactory("B"), undefined);

      content = await readUtf8File(
        path.join(process.cwd(), "types", "ethers-contracts", "hardhat.d.ts"),
      );
      assert.equal(isContractTyped(content, "A"), true);
      assert.equal(isContractTyped(content, "B"), true);
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
