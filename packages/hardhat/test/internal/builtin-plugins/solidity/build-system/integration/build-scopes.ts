import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import {
  exists,
  getAllFilesMatching,
  readJsonFile,
  readUtf8File,
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

const solidityCompilationConfig = {
  solidity: {
    version: "0.8.28",
    splitTestsCompilation: true,
  },
};

describe("build system - build task - behavior on build scope", function () {
  describe("compiling without flags", function () {
    describe("full compilation", function () {
      it("compiles and generates artifacts for all contracts and tests", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE(solidityCompilationConfig);

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
        const hre = await project.getHRE(solidityCompilationConfig);

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
        const hre = await project.getHRE(solidityCompilationConfig);
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
        const hre = await project.getHRE(solidityCompilationConfig);
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
      const hre = await project.getHRE(solidityCompilationConfig);

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
      const hre = await project.getHRE(solidityCompilationConfig);

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
      const hre = await project.getHRE(solidityCompilationConfig);

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
      const hre = await project.getHRE(solidityCompilationConfig);

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

    describe("When user provided files' scopes can't be recognized", async () => {
      it("Should throw if a test file isn't recognized", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE(solidityCompilationConfig);

        const previousCwd = process.cwd();
        process.chdir(project.path);

        try {
          await assertRejectsWithHardhatError(
            hre.tasks
              .getTask("build")
              .run({ noTests: true, files: ["contracts/Foo.t.sol"] }),
            HardhatError.ERRORS.CORE.SOLIDITY.UNRECOGNIZED_FILES_NOT_COMPILED,
            { files: "- contracts/Foo.t.sol" },
          );

          await assertRejectsWithHardhatError(
            hre.tasks
              .getTask("build")
              .run({ noTests: true, files: ["test/OtherFooTest.sol"] }),
            HardhatError.ERRORS.CORE.SOLIDITY.UNRECOGNIZED_FILES_NOT_COMPILED,
            { files: "- test/OtherFooTest.sol" },
          );
        } catch {
          process.chdir(previousCwd);
        }
      });

      it("Should throw if a contract isn't recognized", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE(solidityCompilationConfig);

        const previousCwd = process.cwd();
        process.chdir(project.path);

        try {
          await assertRejectsWithHardhatError(
            hre.tasks
              .getTask("build")
              .run({ noContracts: true, files: ["contracts/Foo.sol"] }),
            HardhatError.ERRORS.CORE.SOLIDITY.UNRECOGNIZED_FILES_NOT_COMPILED,
            { files: "- contracts/Foo.sol" },
          );
        } catch {
          process.chdir(previousCwd);
        }
      });

      it("Should throw if neither is recognized", async () => {
        await using project =
          await useTestProjectTemplate(basicProjectTemplate);
        const hre = await project.getHRE(solidityCompilationConfig);

        const previousCwd = process.cwd();
        process.chdir(project.path);

        try {
          await assertRejectsWithHardhatError(
            hre.tasks.getTask("build").run({
              noContracts: true,
              noTests: true,
              files: ["contracts/Foo.sol", "contracts/Foo.t.sol"],
            }),
            HardhatError.ERRORS.CORE.SOLIDITY.UNRECOGNIZED_FILES_NOT_COMPILED,
            {
              files: `- contracts/Foo.sol
- contracts/Foo.t.sol`,
            },
          );
        } catch {
          process.chdir(previousCwd);
        }
      });
    });
  });
});

describe("build system - splitTestsCompilation: false", function () {
  const unifiedTestsCompilationConfig = {
    solidity: {
      version: "0.8.28",
      splitTestsCompilation: false,
    },
  };

  describe("getRootFilePaths", function () {
    it("returns contract, test, and npm roots for scope 'contracts'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      const roots = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });

      // Should contain the contract file
      assert.ok(
        roots.some((r) => r.endsWith("Foo.sol") && !r.endsWith(".t.sol")),
        "Expected contract root Foo.sol in unified roots",
      );
      // Should contain the .t.sol test file
      assert.ok(
        roots.some((r) => r.endsWith("Foo.t.sol")),
        "Expected test root Foo.t.sol in unified roots",
      );
      // Should contain the test directory test file
      assert.ok(
        roots.some((r) => r.endsWith("OtherFooTest.sol")),
        "Expected test root OtherFooTest.sol in unified roots",
      );
    });

    it("throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.getRootFilePaths({ scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });
  });

  describe("getArtifactsDirectory", function () {
    it("returns the main artifacts dir for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      const contractsDir =
        await hre.solidity.getArtifactsDirectory("contracts");
      const testsDir = await hre.solidity.getArtifactsDirectory("tests");

      assert.equal(contractsDir, testsDir);
    });
  });

  describe("low-level scope:'tests' rejection", function () {
    it("build() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.build([], { scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });

    it("getCompilationJobs() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.getCompilationJobs([], { scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });

    it("emitArtifacts() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // We need a real compilation job to call emitArtifacts.
      // Build first so we can get a compilation job.
      const roots = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });
      const contractRoots = roots.filter(
        (r) => !r.endsWith(".t.sol") && !r.includes("/test/"),
      );
      const result = await hre.solidity.getCompilationJobs(contractRoots, {
        scope: "contracts",
      });

      assert.ok(result.success, "Expected compilation jobs to succeed");

      const firstJob = [...result.compilationJobsPerFile.values()][0];
      const runResult = await hre.solidity.runCompilationJob(firstJob);

      await assertRejectsWithHardhatError(
        hre.solidity.emitArtifacts(firstJob, runResult.output, {
          scope: "tests",
        }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });

    it("cleanupArtifacts() throws for scope 'tests'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await assertRejectsWithHardhatError(
        hre.solidity.cleanupArtifacts([], { scope: "tests" }),
        HardhatError.ERRORS.CORE.SOLIDITY.SPLIT_TESTS_COMPILATION_DISABLED,
        {},
      );
    });
  });

  describe("emitArtifacts - type declarations", function () {
    it("skips per-source artifacts.d.ts for test roots in unified contracts-scope builds", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // Build directly using the build-system APIs (the build task is
      // not updated until Phase 4).
      const roots = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });
      const buildResult = await hre.solidity.build(roots, {
        scope: "contracts",
      });

      assert.ok(
        hre.solidity.isSuccessfulBuildResult(buildResult),
        "Expected build to succeed",
      );

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Contract root should have artifacts.d.ts
      assert.equal(
        await exists(
          path.join(artifactsPath, "contracts", "Foo.sol", "artifacts.d.ts"),
        ),
        true,
      );

      // Test roots should NOT have artifacts.d.ts
      assert.equal(
        await exists(
          path.join(artifactsPath, "contracts", "Foo.t.sol", "artifacts.d.ts"),
        ),
        false,
      );
      assert.equal(
        await exists(
          path.join(
            artifactsPath,
            "test",
            "OtherFooTest.sol",
            "artifacts.d.ts",
          ),
        ),
        false,
      );
    });
  });

  describe("unified cleanup", function () {
    it("includes test artifacts in duplicate-name detection", async () => {
      const duplicateNameTemplate = {
        name: "test",
        version: "1.0.0",
        files: {
          "contracts/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\ncontract Foo {}`,
          "test/Foo.sol": `// SPDX-License-Identifier: UNLICENSED\npragma solidity ^0.8.0;\ncontract Foo {}`,
        },
      };

      await using project = await useTestProjectTemplate(duplicateNameTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // Build directly using the build-system APIs (the build task is
      // not updated until Phase 4).
      const roots = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });
      const buildResult = await hre.solidity.build(roots, {
        scope: "contracts",
      });

      assert.ok(
        hre.solidity.isSuccessfulBuildResult(buildResult),
        "Expected build to succeed",
      );

      await hre.solidity.cleanupArtifacts([...buildResult.keys()], {
        scope: "contracts",
      });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // The top-level artifacts.d.ts should exist and contain the duplicate
      const topLevelDts = path.join(artifactsPath, "artifacts.d.ts");
      assert.equal(await exists(topLevelDts), true);
      const dtsContent = await readUtf8File(topLevelDts);
      assert.ok(
        dtsContent.includes('"Foo"'),
        "Expected top-level artifacts.d.ts to include the duplicated contract name Foo from both test and contract artifacts",
      );
    });

    it("passes mixed contract and test artifact paths to onCleanUpArtifacts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // Build directly using the build-system APIs (the build task is
      // not updated until Phase 4).
      const roots = await hre.solidity.getRootFilePaths({
        scope: "contracts",
      });
      const buildResult = await hre.solidity.build(roots, {
        scope: "contracts",
      });

      assert.ok(
        hre.solidity.isSuccessfulBuildResult(buildResult),
        "Expected build to succeed",
      );

      // This is run directly here, so this isn't testing much now, but will be
      // better tested in Phase 4
      await hre.solidity.cleanupArtifacts([...buildResult.keys()], {
        scope: "contracts",
      });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // All artifacts should be in the main artifacts directory
      const buildInfoDir = path.join(artifactsPath, "build-info");
      const artifactPaths = await getAllFilesMatching(
        artifactsPath,
        (p) =>
          p.endsWith(".json") &&
          p.indexOf(path.sep, artifactsPath.length + path.sep.length) !== -1,
        (dir) => dir !== buildInfoDir,
      );

      // Should include both contract and test artifacts
      assert.ok(
        artifactPaths.some(
          (p) => p.includes("Foo.sol") && !p.includes(".t.sol"),
        ),
        "Expected contract artifact Foo.json in unified artifacts",
      );
      assert.ok(
        artifactPaths.some((p) => p.includes("Foo.t.sol")),
        "Expected test artifact FooTest.json in unified artifacts",
      );
      assert.ok(
        artifactPaths.some((p) => p.includes("OtherFooTest.sol")),
        "Expected test artifact OtherFooTest.json in unified artifacts",
      );
    });
  });
});
