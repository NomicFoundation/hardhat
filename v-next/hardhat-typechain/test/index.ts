import assert from "node:assert/strict";
import path from "node:path";
import { before, describe, it } from "node:test";

import {
  assertRejects,
  useFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import {
  exists,
  readUtf8File,
  remove,
} from "@nomicfoundation/hardhat-utils/fs";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import hardhatTypechain from "../src/index.js";

describe("hardhat-typechain", () => {
  describe("check that types are generated correctly", () => {
    const projectFolder = "generate-types";

    useFixtureProject(projectFolder);

    before(async () => {
      await remove(`${process.cwd()}/types`);

      const hardhatConfig = await import(
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);

      await hre.tasks.getTask("clean").run();

      await hre.tasks.getTask("build").run();
    });

    it("should generate the types for the `hardhat.d.ts` file", async () => {
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
    });

    it("should generated types for the contracts and add the support for the `attach` method for concrete contracts", async () => {
      const content = await readUtf8File(
        path.join(
          process.cwd(),
          "types",
          "ethers-contracts",
          "factories",
          "A__factory.ts",
        ),
      );

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

    it("should not generate types for the contracts and do not add the support for the `attach` method for abstract contracts", async () => {
      const content = await readUtf8File(
        path.join(
          process.cwd(),
          "types",
          "ethers-contracts",
          "factories",
          "A__factory.ts",
        ),
      );

      // The "Addressable" type should be imported
      assert.equal(
        content.includes(`import type { Addressable } from "ethers";`),
        true,
      );

      // The "attach" method should not be added to the factory of an abstract contract
      assert.equal(
        content.includes(`override attach(address: string | Addressable): B {`),
        false,
      );
    });
  });

  describe("typechain should not generate types during compilation", () => {
    describe("when the configuration property dontOverrideCompile is set to true", () => {
      const projectFolder = "skip-type-generation";

      useFixtureProject(projectFolder);

      it("should not generate the types", async () => {
        const hardhatConfig = await import(
          `./fixture-projects/${projectFolder}/hardhat.config.js`
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        assert.equal(await exists(`${process.cwd()}/types`), false);

        await hre.tasks.getTask("clean").run();

        await hre.tasks.getTask("build").run();

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

        await hre.tasks.getTask("build").run();

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
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);

      await hre.tasks.getTask("clean").run();

      await hre.tasks.getTask("build").run();

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
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      assert.equal(await exists(`${process.cwd()}/types`), false);
      assert.equal(await exists(`${process.cwd()}/custom-types`), false);

      await hre.tasks.getTask("clean").run();

      await hre.tasks.getTask("build").run({ quiet: true });

      assert.equal(await exists(`${process.cwd()}/custom-types`), true);
      assert.equal(await exists(`${process.cwd()}/types`), false);
    });
  });

  describe("types are generated for partial compilation", () => {
    const projectFolder = "generate-types";

    useFixtureProject(projectFolder);

    it("should generate types for the artifacts of the only file being compiled on a fresh build", async () => {
      const hardhatConfig = await import(
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      // Clean everything to start fresh
      await hre.tasks.getTask("clean").run();

      // Verify types don't exist
      assert.equal(await exists(`${process.cwd()}/types`), false);

      // Build only a single file (partial compilation)
      await hre.tasks
        .getTask("build")
        .run({ files: ["contracts/A.sol"], quiet: true });

      // Types should be generated for the compiled contract, which is just
      // A.ts, and not B.ts in this case
      assert.equal(await exists(`${process.cwd()}/types`), true);
      assert.equal(
        await exists(
          path.join(process.cwd(), "types", "ethers-contracts", "A.ts"),
        ),
        true,
      );
      assert.equal(
        await exists(
          path.join(process.cwd(), "types", "ethers-contracts", "B.ts"),
        ),
        false,
      );
    });

    it("should generate types for all the artifacts present in the file system, even if a single file is being compiled", async () => {
      const hardhatConfig = await import(
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      // Initial clean build of all contracts
      await hre.tasks.getTask("clean").run();
      await hre.tasks.getTask("build").run({ quiet: true });

      // Verify types were generated for both contracts
      assert.equal(
        await exists(
          path.join(process.cwd(), "types", "ethers-contracts", "A.ts"),
        ),
        true,
      );
      assert.equal(
        await exists(
          path.join(process.cwd(), "types", "ethers-contracts", "B.ts"),
        ),
        true,
      );

      // Delete types directory
      await remove(`${process.cwd()}/types`);
      assert.equal(await exists(`${process.cwd()}/types`), false);

      // Build only one file (partial compilation with cache hit for the other)
      await hre.tasks
        .getTask("build")
        .run({ files: ["contracts/A.sol"], quiet: true });

      // Types should be regenerated for ALL artifacts, not just the one compiled
      assert.equal(
        await exists(
          path.join(process.cwd(), "types", "ethers-contracts", "A.ts"),
        ),
        true,
      );
      assert.equal(
        await exists(
          path.join(process.cwd(), "types", "ethers-contracts", "B.ts"),
        ),
        true,
      );
    });
  });

  describe("types are not generated when build fails", () => {
    const projectFolder = "compilation-error";

    useFixtureProject(projectFolder);

    it("should not generate types when compilation fails", async () => {
      // Use inline config to avoid circular module dependency issues
      const hre = await createHardhatRuntimeEnvironment({
        solidity: {
          version: "0.8.28",
        },
        plugins: [hardhatTypechain],
      });

      await hre.tasks.getTask("clean").run();

      // Build should throw due to compilation error
      await assertRejects(async () =>
        hre.tasks.getTask("build").run({ quiet: true }),
      );

      // Types should NOT be generated
      assert.equal(await exists(`${process.cwd()}/types`), false);
    });
  });

  describe("types are not generated for test scope", () => {
    const projectFolder = "generate-types";

    useFixtureProject(projectFolder);

    it("should not generate types when building with test scope", async () => {
      const hardhatConfig = await import(
        `./fixture-projects/${projectFolder}/hardhat.config.js`
      );

      const hre = await createHardhatRuntimeEnvironment(hardhatConfig.default);

      await hre.tasks.getTask("clean").run();

      // Build with test scope directly, passing a normal contract, but with
      // an explicit scope
      await hre.solidity.build(
        [path.join(hre.config.paths.root, "contracts", "A.sol")],
        { scope: "tests", quiet: true },
      );

      // Types should NOT be generated for test scope builds
      assert.equal(await exists(`${process.cwd()}/types`), false);
    });
  });

  describe("clean hook removes the types folder", () => {
    describe("with default outDir", () => {
      const projectFolder = "generate-types";

      useFixtureProject(projectFolder);

      it("should remove the types folder when clean is run", async () => {
        const hardhatConfig = await import(
          `./fixture-projects/${projectFolder}/hardhat.config.js`
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        // Clean first to ensure fresh state
        await hre.tasks.getTask("clean").run();

        // Build to generate types
        await hre.tasks.getTask("build").run({ quiet: true });
        assert.equal(await exists(`${process.cwd()}/types`), true);

        // Run clean again
        await hre.tasks.getTask("clean").run();

        // Types folder should be removed
        assert.equal(await exists(`${process.cwd()}/types`), false);
      });

      it("should not fail if types folder does not exist", async () => {
        const hardhatConfig = await import(
          `./fixture-projects/${projectFolder}/hardhat.config.js`
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        // Ensure types folder does not exist
        await remove(`${process.cwd()}/types`);
        assert.equal(await exists(`${process.cwd()}/types`), false);

        // Run clean - should not throw
        await hre.tasks.getTask("clean").run();

        // Still no types folder, but no error
        assert.equal(await exists(`${process.cwd()}/types`), false);
      });
    });

    describe("with custom outDir", () => {
      const projectFolder = "custom-out-dir";

      useFixtureProject(projectFolder);

      it("should remove the custom types folder when clean is run", async () => {
        const hardhatConfig = await import(
          `./fixture-projects/${projectFolder}/hardhat.config.js`
        );

        const hre = await createHardhatRuntimeEnvironment(
          hardhatConfig.default,
        );

        // Clean first to ensure fresh state
        await hre.tasks.getTask("clean").run();

        // Build to generate types in custom directory
        await hre.tasks.getTask("build").run({ quiet: true });
        assert.equal(await exists(`${process.cwd()}/custom-types`), true);

        // Run clean again
        await hre.tasks.getTask("clean").run();

        // Custom types folder should be removed
        assert.equal(await exists(`${process.cwd()}/custom-types`), false);
      });
    });
  });
});
