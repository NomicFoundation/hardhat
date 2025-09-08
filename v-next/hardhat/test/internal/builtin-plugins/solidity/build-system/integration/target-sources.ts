import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  exists,
  readJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import { useTestProjectTemplate } from "../resolver/helpers.js";

const basicProjectTemplate = {
  name: "test",
  version: "1.0.0",
  files: {
    "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED \n pragma solidity ^0.8.0; contract Foo {}`,
    "contracts/Foo.t.sol": `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.0;

      import {Foo} from "./Foo.sol";

      contract FooTest {
        Foo foo;

        function setUp() public {
          foo = new Foo();
        }

        function test_Assertion() public view {
          require(1 == 1, "test assertion");
        }
      }
    `,
    "test/OtherFooTest.sol": `
      // SPDX-License-Identifier: UNLICENSED
      pragma solidity ^0.8.0;

      import {Foo} from "../contracts/Foo.sol";

      contract OtherFooTest {
        Foo foo;

        function setUp() public {
          foo = new Foo();
        }

        function test_Assertion() public view {
          require(1 == 1, "test assertion");
        }
      }
    `,
  },
};

describe("build system - build task - behavior on target sources", function () {
  describe("compiling contracts", function () {
    it("compiles and generates artifacts for all contracts, and no artifacts for tests", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      await hre.tasks.getTask("build").run(); // not specifying targetSources, testing it defaults to 'contracts'

      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Read artifact file (asserts it exists)
      const artifact: any = await readJsonFile(
        path.join(contractsArtifactsPath, "contracts", `Foo.sol`, `Foo.json`),
      );

      // Assert build info file exists
      const buildInfoPath = path.join(
        contractsArtifactsPath,
        "build-info",
        `${artifact.buildInfoId}.json`,
      );
      assert.equal(await exists(buildInfoPath), true);

      const buildInfo: any = await readJsonFile(buildInfoPath);

      // Foo.sol is in sources
      assert.notEqual(
        buildInfo.input.sources["project/contracts/Foo.sol"],
        undefined,
      );

      // No tests are on sources
      assert.equal(Object.keys(buildInfo.input.sources).length, 1);
    });

    it("performs cleanup on contract artifacts and build infos", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      // Create test build info and artifact file that should be cleaned up
      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      const testBuildInfoPath = path.join(
        artifactsPath,
        "build-info",
        "test_build.json",
      );

      const testArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "Bar.sol",
        "Bar.json",
      );
      await writeUtf8File(testBuildInfoPath, "");
      await writeUtf8File(testArtifactPath, "");

      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(testArtifactPath), true);

      await hre.tasks.getTask("build").run(); // not specifying targetSources, testing it defaults to 'contracts'

      // unused build info and artifact files should be removed
      assert.equal(await exists(testBuildInfoPath), false);
      assert.equal(await exists(testArtifactPath), false);
    });

    it("doesn't perform cleanup on solidity tests artifacts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      // Create test build info and artifact file for test contracts, so they shouldn't be cleaned up
      const artifactsPath = await hre.solidity.getArtifactsDirectory("tests");

      const testBuildInfoPath = path.join(
        artifactsPath,
        "build-info",
        "test_build.json",
      );

      const testArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "Bar.t.sol",
        "Bar.json",
      );
      await writeUtf8File(testBuildInfoPath, "");
      await writeUtf8File(testArtifactPath, "");

      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(testArtifactPath), true);

      await hre.tasks.getTask("build").run(); // not specifying targetSources, testing it defaults to 'contracts'

      // test build info and artifact for tests shouldn't be removed
      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(testArtifactPath), true);
    });
  });

  describe("compiling tests", function () {
    it("compiles and generates artifacts for all tests, and no artifacts for contracts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      await hre.tasks.getTask("build").run({ targetSources: "tests" });

      const testsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("tests");

      // Read artifact files (asserts they exists)
      const artifact: any = await readJsonFile(
        path.join(testsArtifactsPath, "contracts", `Foo.t.sol`, `FooTest.json`),
      );

      await readJsonFile(
        path.join(
          testsArtifactsPath,
          "test",
          `OtherFooTest.sol`,
          `OtherFooTest.json`,
        ),
      );

      // Assert build info file exists
      const buildInfoPath = path.join(
        testsArtifactsPath,
        "build-info",
        `${artifact.buildInfoId}.json`,
      );
      assert.equal(await exists(buildInfoPath), true);

      // not even the contracts artifacts directory is created
      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      assert.equal(await exists(contractsArtifactsPath), false);
    });

    it("performs cleanup on tests artifacts and build infos", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      // Create test build info and artifact file that should be cleaned up
      const artifactsPath = await hre.solidity.getArtifactsDirectory("tests");

      const testBuildInfoPath = path.join(
        artifactsPath,
        "build-info",
        "test_build.json",
      );

      const testArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "BarTest.sol",
        "BarTest.json",
      );
      await writeUtf8File(testBuildInfoPath, "");
      await writeUtf8File(testArtifactPath, "");

      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(testArtifactPath), true);

      await hre.tasks.getTask("build").run({ targetSources: "tests" });

      // unused build info and artifact files should be removed
      assert.equal(await exists(testBuildInfoPath), false);
      assert.equal(await exists(testArtifactPath), false);
    });

    it("doesn't perform cleanup on contract artifacts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      // Create test build info and artifact file for contracts, so they shouldn't be cleaned up
      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      const testBuildInfoPath = path.join(
        artifactsPath,
        "build-info",
        "test_build.json",
      );

      const testArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "Bar.sol",
        "Bar.json",
      );
      await writeUtf8File(testBuildInfoPath, "");
      await writeUtf8File(testArtifactPath, "");

      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(testArtifactPath), true);

      await hre.tasks.getTask("build").run({ targetSources: "tests" }); // not specifying targetSources, testing it defaults to 'contracts'

      // test build info and artifact for tests shouldn't be removed
      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(testArtifactPath), true);
    });
  });
});
