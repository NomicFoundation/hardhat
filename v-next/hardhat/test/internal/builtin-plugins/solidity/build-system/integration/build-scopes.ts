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

describe("build system - build task - behavior on build scope", function () {
  describe("compiling without flags", function () {
    describe("full compilation", function () {
      it("compiles and generates artifacts for all contracts and tests", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE();

        await hre.tasks.getTask("build").run();

        const contractsArtifactsPath =
          await hre.solidity.getArtifactsDirectory("contracts");
        const testsArtifactsPath =
          await hre.solidity.getArtifactsDirectory("tests");

        // Read artifact files (asserts they exists)
        await readJsonFile(
          path.join(contractsArtifactsPath, "contracts", `Foo.sol`, `Foo.json`),
        );
        await readJsonFile(
          path.join(
            testsArtifactsPath,
            "contracts",
            `Foo.t.sol`,
            `FooTest.json`,
          ),
        );

        await readJsonFile(
          path.join(
            testsArtifactsPath,
            "test",
            `OtherFooTest.sol`,
            `OtherFooTest.json`,
          ),
        );
      });

      it("performs cleanup on both contracts and tests artifacts and build infos", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE();

        // Create test build info and artifact file that should be cleaned up
        const contractsArtifactsPath =
          await hre.solidity.getArtifactsDirectory("contracts");
        const testsArtifactsPath =
          await hre.solidity.getArtifactsDirectory("tests");

        // Create stub build info files that should be cleaned up
        const contractBuildInfoPath = path.join(
          contractsArtifactsPath,
          "build-info",
          "test_build.json",
        );
        const testBuildInfoPath = path.join(
          testsArtifactsPath,
          "build-info",
          "test_build.json",
        );

        // Create stub artifact files that should be cleaned up
        const contractArtifactPath = path.join(
          contractsArtifactsPath,
          "contracts",
          "Bar.sol",
          "Bar.json",
        );
        const testArtifactPath = path.join(
          testsArtifactsPath,
          "contracts",
          "Bar.t.sol",
          "Bar.json",
        );

        await writeUtf8File(contractBuildInfoPath, "");
        await writeUtf8File(testBuildInfoPath, "");
        await writeUtf8File(contractArtifactPath, "");
        await writeUtf8File(testArtifactPath, "");

        assert.equal(await exists(contractBuildInfoPath), true);
        assert.equal(await exists(testBuildInfoPath), true);
        assert.equal(await exists(contractArtifactPath), true);
        assert.equal(await exists(testArtifactPath), true);

        await hre.tasks.getTask("build").run();

        // unused build info and artifact files should be removed
        assert.equal(await exists(contractBuildInfoPath), false);
        assert.equal(await exists(testBuildInfoPath), false);
        assert.equal(await exists(contractArtifactPath), false);
        assert.equal(await exists(testArtifactPath), false);
      });
    });

    describe("specifying files", function () {
      it("identifies when a file is a contract", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE();
        process.chdir(project.path);

        await hre.tasks.getTask("build").run({ files: ["contracts/Foo.sol"] });

        // Artifact should be on the contracts directory
        const contractsArtifactsPath =
          await hre.solidity.getArtifactsDirectory("contracts");
        await readJsonFile(
          path.join(contractsArtifactsPath, "contracts", `Foo.sol`, `Foo.json`),
        );
      });

      it("identifies when a file is a test", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE();
        process.chdir(project.path);

        await hre.tasks
          .getTask("build")
          .run({ files: ["test/OtherFooTest.sol", "contracts/Foo.t.sol"] });

        // Artifacts should be on the tests artifact directory
        const testsArtifactsPath =
          await hre.solidity.getArtifactsDirectory("tests");

        await readJsonFile(
          path.join(
            testsArtifactsPath,
            "contracts",
            `Foo.t.sol`,
            `FooTest.json`,
          ),
        );
        await readJsonFile(
          path.join(
            testsArtifactsPath,
            "test",
            `OtherFooTest.sol`,
            `OtherFooTest.json`,
          ),
        );
      });
    });
  });

  describe("compiling with the --no-test flag", function () {
    it("compiles and generates artifacts for contracts, but not tests", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      await hre.tasks.getTask("build").run({ noTests: true });

      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");
      const testsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("tests");

      // Contract artifacts should exist
      assert.equal(
        await exists(
          path.join(contractsArtifactsPath, "contracts", `Foo.sol`, `Foo.json`),
        ),
        true,
      );

      // Test artifacts should not exist
      assert.equal(
        await exists(
          path.join(
            testsArtifactsPath,
            "contracts",
            `Foo.t.sol`,
            `FooTest.json`,
          ),
        ),
        false,
      );
      assert.equal(
        await exists(
          path.join(
            testsArtifactsPath,
            "test",
            `OtherFooTest.sol`,
            `OtherFooTest.json`,
          ),
        ),
        false,
      );
    });

    it("performs cleanup on contract artifacts, but not tests", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      // Create test build info and artifact file that should be cleaned up
      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");
      const testsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("tests");

      // Create stub build info files that should be cleaned up
      const contractBuildInfoPath = path.join(
        contractsArtifactsPath,
        "build-info",
        "test_build.json",
      );
      const testBuildInfoPath = path.join(
        testsArtifactsPath,
        "build-info",
        "test_build.json",
      );

      // Create stub artifact files that should be cleaned up
      const contractArtifactPath = path.join(
        contractsArtifactsPath,
        "contracts",
        "Bar.sol",
        "Bar.json",
      );
      const testArtifactPath = path.join(
        testsArtifactsPath,
        "contracts",
        "Bar.t.sol",
        "Bar.json",
      );

      await writeUtf8File(contractBuildInfoPath, "");
      await writeUtf8File(testBuildInfoPath, "");
      await writeUtf8File(contractArtifactPath, "");
      await writeUtf8File(testArtifactPath, "");

      assert.equal(await exists(contractBuildInfoPath), true);
      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(contractArtifactPath), true);
      assert.equal(await exists(testArtifactPath), true);

      await hre.tasks.getTask("build").run({ noTests: true });

      // unused build info and artifact files should be removed
      assert.equal(await exists(contractBuildInfoPath), false);
      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(contractArtifactPath), false);
      assert.equal(await exists(testArtifactPath), true);
    });
  });

  describe("compiling with the --no-contracts flag", function () {
    it("compiles and generates artifacts for tests, but not contracts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      await hre.tasks.getTask("build").run({ noContracts: true });

      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");
      const testsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("tests");

      // Contract artifacts should not exist
      assert.equal(
        await exists(
          path.join(contractsArtifactsPath, "contracts", `Foo.sol`, `Foo.json`),
        ),
        false,
      );

      // Test artifacts should  exist
      assert.equal(
        await exists(
          path.join(
            testsArtifactsPath,
            "contracts",
            `Foo.t.sol`,
            `FooTest.json`,
          ),
        ),
        true,
      );
      assert.equal(
        await exists(
          path.join(
            testsArtifactsPath,
            "test",
            `OtherFooTest.sol`,
            `OtherFooTest.json`,
          ),
        ),
        true,
      );
    });

    it("performs cleanup on tests artifacts, but not contracts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE();

      // Create test build info and artifact file that should be cleaned up
      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");
      const testsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("tests");

      // Create stub build info files that should be cleaned up
      const contractBuildInfoPath = path.join(
        contractsArtifactsPath,
        "build-info",
        "test_build.json",
      );
      const testBuildInfoPath = path.join(
        testsArtifactsPath,
        "build-info",
        "test_build.json",
      );

      // Create stub artifact files that should be cleaned up
      const contractArtifactPath = path.join(
        contractsArtifactsPath,
        "contracts",
        "Bar.sol",
        "Bar.json",
      );
      const testArtifactPath = path.join(
        testsArtifactsPath,
        "contracts",
        "Bar.t.sol",
        "Bar.json",
      );

      await writeUtf8File(contractBuildInfoPath, "");
      await writeUtf8File(testBuildInfoPath, "");
      await writeUtf8File(contractArtifactPath, "");
      await writeUtf8File(testArtifactPath, "");

      assert.equal(await exists(contractBuildInfoPath), true);
      assert.equal(await exists(testBuildInfoPath), true);
      assert.equal(await exists(contractArtifactPath), true);
      assert.equal(await exists(testArtifactPath), true);

      await hre.tasks.getTask("build").run({ noContracts: true });

      // only tests unused files should be cleaned up
      assert.equal(await exists(contractBuildInfoPath), true);
      assert.equal(await exists(contractArtifactPath), true);
      assert.equal(await exists(testBuildInfoPath), false);
      assert.equal(await exists(testArtifactPath), false);
    });
  });
});
