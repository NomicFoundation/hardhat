import type {
  HookContext,
  SolidityHooks,
} from "../../../../../../src/types/hooks.js";
import type { HardhatPlugin } from "../../../../../../src/types/plugins.js";
import type {
  BuildOptions,
  BuildScope,
  CompilationJobCreationError,
  FileBuildResult,
} from "../../../../../../src/types/solidity/build-system.js";

import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import {
  exists,
  readJsonFile,
  writeUtf8File,
} from "@nomicfoundation/hardhat-utils/fs";

import { useTestProjectTemplate } from "../resolver/helpers.js";

/**
 * Creates a plugin that installs a `solidity.build` hook adding `extraFile`
 * to the root file paths. If `onlyForScope` is provided, the file is only
 * added when the build is invoked for that scope.
 */
function makeBuildHookAddingPlugin(
  extraFile: string,
  onlyForScope?: BuildScope,
): HardhatPlugin {
  return {
    id: "test-build-hook-adding-plugin",
    hookHandlers: {
      solidity: async () => ({
        default: async () => {
          const handlers: Partial<SolidityHooks> = {
            build: async (
              context: HookContext,
              rootFilePaths: string[],
              options: BuildOptions | undefined,
              next: (
                nextContext: HookContext,
                nextRootFilePaths: string[],
                nextOptions: BuildOptions | undefined,
              ) => Promise<
                CompilationJobCreationError | Map<string, FileBuildResult>
              >,
            ) => {
              const shouldAdd =
                onlyForScope === undefined || options?.scope === onlyForScope;
              const nextRoots = shouldAdd
                ? [...rootFilePaths, extraFile]
                : rootFilePaths;
              return next(context, nextRoots, options);
            },
          };
          return handlers;
        },
      }),
    },
  };
}

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

      it("includes a hook-added contract root in the returned contractRootPaths", async () => {
        await using project = await useTestProjectTemplate({
          ...basicProjectTemplate,
          name: "test-split-hook-adds-contract",
          files: {
            ...basicProjectTemplate.files,
            "extra/AddedByHook.sol": `// SPDX-License-Identifier: UNLICENSED
              pragma solidity ^0.8.0;
              contract AddedByHook {}`,
          },
        });
        const extraFile = path.join(project.path, "extra/AddedByHook.sol");
        const hre = await project.getHRE({
          ...solidityCompilationConfig,
          plugins: [makeBuildHookAddingPlugin(extraFile, "contracts")],
        });

        const result: {
          contractRootPaths: string[];
          testRootPaths: string[];
        } = await hre.tasks.getTask("build").run();

        assert.ok(
          result.contractRootPaths.some((r) => r === extraFile),
          "Expected hook-added AddedByHook.sol in contractRootPaths",
        );
        assert.ok(
          !result.testRootPaths.some((r) => r === extraFile),
          "Did not expect hook-added contract in testRootPaths",
        );
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
  });

  describe("explicit files with compatible scope flags", function () {
    it("builds contract files with --no-tests", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(solidityCompilationConfig);
      process.chdir(project.path);

      await hre.tasks
        .getTask("build")
        .run({ files: ["contracts/Foo.sol"], noTests: true });

      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");
      await readJsonFile(
        path.join(contractsArtifactsPath, "contracts", "Foo.sol", "Foo.json"),
      );
    });

    it("builds test files with --no-contracts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(solidityCompilationConfig);
      process.chdir(project.path);

      await hre.tasks
        .getTask("build")
        .run({ files: ["contracts/Foo.t.sol"], noContracts: true });

      const testsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("tests");
      await readJsonFile(
        path.join(testsArtifactsPath, "contracts", "Foo.t.sol", "FooTest.json"),
      );
    });
  });

  describe("explicit files in one scope without flags", function () {
    it("skips the contracts scope when only test files are passed", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(solidityCompilationConfig);
      process.chdir(project.path);

      await hre.tasks
        .getTask("build")
        .run({ files: ["test/OtherFooTest.sol"] });

      const testsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("tests");

      // Test artifact should exist
      await readJsonFile(
        path.join(
          testsArtifactsPath,
          "test",
          "OtherFooTest.sol",
          "OtherFooTest.json",
        ),
      );

      // Contract artifacts should NOT exist (contracts scope was skipped)
      const contractsArtifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");
      assert.equal(
        await exists(
          path.join(contractsArtifactsPath, "contracts", "Foo.sol", "Foo.json"),
        ),
        false,
        "Contract artifact should not exist when only test files were passed",
      );
    });
  });
});

describe("build system - mode-independent file+flag validation", function () {
  // These tests use the default config (splitTestsCompilation: false)
  // because the validation applies identically in both modes.
  it("throws when test files are passed with --no-tests", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE();
    process.chdir(project.path);

    await assertRejectsWithHardhatError(
      hre.tasks
        .getTask("build")
        .run({ noTests: true, files: ["test/OtherFooTest.sol"] }),
      HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
      {
        files: `- ${path.resolve(project.path, "test/OtherFooTest.sol")}`,
      },
    );
  });

  it("throws when contract files are passed with --no-contracts", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE();
    process.chdir(project.path);

    await assertRejectsWithHardhatError(
      hre.tasks
        .getTask("build")
        .run({ noContracts: true, files: ["contracts/Foo.sol"] }),
      HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
      {
        files: `- ${path.resolve(project.path, "contracts/Foo.sol")}`,
      },
    );
  });

  it("throws for the test file when mixed files are passed with --no-tests", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE();
    process.chdir(project.path);

    await assertRejectsWithHardhatError(
      hre.tasks.getTask("build").run({
        noTests: true,
        files: ["contracts/Foo.sol", "test/OtherFooTest.sol"],
      }),
      HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
      {
        files: `- ${path.resolve(project.path, "test/OtherFooTest.sol")}`,
      },
    );
  });

  it("throws for the contract file when mixed files are passed with --no-contracts", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE();
    process.chdir(project.path);

    await assertRejectsWithHardhatError(
      hre.tasks.getTask("build").run({
        noContracts: true,
        files: ["contracts/Foo.sol", "test/OtherFooTest.sol"],
      }),
      HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
      {
        files: `- ${path.resolve(project.path, "contracts/Foo.sol")}`,
      },
    );
  });

  it("throws for the first conflict when both flags are set", async () => {
    await using project = await useTestProjectTemplate(basicProjectTemplate);
    const hre = await project.getHRE();
    process.chdir(project.path);

    // noContracts is checked first, so only the contract file appears in the error
    await assertRejectsWithHardhatError(
      hre.tasks.getTask("build").run({
        noContracts: true,
        noTests: true,
        files: ["contracts/Foo.sol", "contracts/Foo.t.sol"],
      }),
      HardhatError.ERRORS.CORE.SOLIDITY.INCOMPATIBLE_FILES_WITH_BUILD_FLAGS,
      {
        files: `- ${path.resolve(project.path, "contracts/Foo.sol")}`,
      },
    );
  });
});

describe("build system - splitTestsCompilation: false - build task", function () {
  const unifiedTestsCompilationConfig = {
    solidity: {
      version: "0.8.28",
      splitTestsCompilation: false,
    },
  };

  describe("full build", function () {
    it("compiles contracts and tests together", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await hre.tasks.getTask("build").run();

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Contract artifact
      await readJsonFile(
        path.join(artifactsPath, "contracts", "Foo.sol", "Foo.json"),
      );
      // Test artifacts in main artifacts dir
      await readJsonFile(
        path.join(artifactsPath, "contracts", "Foo.t.sol", "FooTest.json"),
      );
      await readJsonFile(
        path.join(
          artifactsPath,
          "test",
          "OtherFooTest.sol",
          "OtherFooTest.json",
        ),
      );
    });

    it("runs cleanup on the main artifacts directory", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Create a stale artifact
      const staleArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "Stale.sol",
        "Stale.json",
      );
      await writeUtf8File(staleArtifactPath, "");
      assert.equal(await exists(staleArtifactPath), true);

      await hre.tasks.getTask("build").run();

      // Stale artifact should be cleaned up
      assert.equal(await exists(staleArtifactPath), false);
    });

    it("partitions returned contractRootPaths and testRootPaths with getScope()", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      const result: {
        contractRootPaths: string[];
        testRootPaths: string[];
      } = await hre.tasks.getTask("build").run();

      assert.ok(
        result.contractRootPaths.some(
          (r) => r.endsWith("Foo.sol") && !r.endsWith(".t.sol"),
        ),
        "Expected Foo.sol in contractRootPaths",
      );
      assert.ok(
        result.testRootPaths.some((r) => r.endsWith("Foo.t.sol")),
        "Expected Foo.t.sol in testRootPaths",
      );
      assert.ok(
        result.testRootPaths.some((r) => r.endsWith("OtherFooTest.sol")),
        "Expected OtherFooTest.sol in testRootPaths",
      );
    });

    it("includes a hook-added contract root in the returned contractRootPaths", async () => {
      await using project = await useTestProjectTemplate({
        ...basicProjectTemplate,
        name: "test-unified-hook-adds-contract",
        files: {
          ...basicProjectTemplate.files,
          "extra/AddedByHook.sol": `// SPDX-License-Identifier: UNLICENSED
            pragma solidity ^0.8.0;
            contract AddedByHook {}`,
        },
      });
      const extraFile = path.join(project.path, "extra/AddedByHook.sol");
      const hre = await project.getHRE({
        ...unifiedTestsCompilationConfig,
        plugins: [makeBuildHookAddingPlugin(extraFile)],
      });

      const result: {
        contractRootPaths: string[];
        testRootPaths: string[];
      } = await hre.tasks.getTask("build").run();

      assert.ok(
        result.contractRootPaths.some((r) => r === extraFile),
        "Expected hook-added AddedByHook.sol in contractRootPaths",
      );
      assert.ok(
        !result.testRootPaths.some((r) => r === extraFile),
        "Did not expect hook-added contract in testRootPaths",
      );
    });
  });

  describe("explicit files", function () {
    it("compiles exactly the provided files", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);
      process.chdir(project.path);

      await hre.tasks.getTask("build").run({ files: ["contracts/Foo.sol"] });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Only Foo.sol should have been compiled
      await readJsonFile(
        path.join(artifactsPath, "contracts", "Foo.sol", "Foo.json"),
      );
    });

    it("uses the main artifacts dir for explicit files", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);
      process.chdir(project.path);

      // Compile a test file explicitly — it should still go through
      // scope: "contracts" at the low level
      await hre.tasks
        .getTask("build")
        .run({ files: ["test/OtherFooTest.sol"] });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // The test artifact should be in the main artifacts directory
      await readJsonFile(
        path.join(
          artifactsPath,
          "test",
          "OtherFooTest.sol",
          "OtherFooTest.json",
        ),
      );
    });

    it("does not run cleanup for explicit-file builds", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // First do a full build
      await hre.tasks.getTask("build").run();

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Create a stale artifact
      const staleArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "Stale.sol",
        "Stale.json",
      );
      await writeUtf8File(staleArtifactPath, "");

      process.chdir(project.path);

      // Partial build with explicit files
      await hre.tasks.getTask("build").run({ files: ["contracts/Foo.sol"] });

      // Stale artifact should NOT be cleaned up
      assert.equal(await exists(staleArtifactPath), true);
    });

    it("builds contract files with --no-tests", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);
      process.chdir(project.path);

      await hre.tasks
        .getTask("build")
        .run({ files: ["contracts/Foo.sol"], noTests: true });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Contract artifact should exist
      await readJsonFile(
        path.join(artifactsPath, "contracts", "Foo.sol", "Foo.json"),
      );
    });

    it("builds test files with --no-contracts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);
      process.chdir(project.path);

      await hre.tasks
        .getTask("build")
        .run({ files: ["contracts/Foo.t.sol"], noContracts: true });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Test artifact should be in the main artifacts directory
      await readJsonFile(
        path.join(artifactsPath, "contracts", "Foo.t.sol", "FooTest.json"),
      );
    });
  });

  describe("--no-tests", function () {
    it("behaves like a partial build over all contracts", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      await hre.tasks.getTask("build").run({ noTests: true });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Contract artifact should exist
      await readJsonFile(
        path.join(artifactsPath, "contracts", "Foo.sol", "Foo.json"),
      );

      // Test artifacts should also exist because they're dependencies,
      // but the test roots themselves weren't included as roots
      const noTestsResult: {
        contractRootPaths: string[];
        testRootPaths: string[];
      } = await hre.tasks.getTask("build").run({ noTests: true });
      assert.ok(
        noTestsResult.contractRootPaths.length > 0,
        "Expected contractRootPaths to contain entries",
      );
      assert.equal(
        noTestsResult.testRootPaths.length,
        0,
        "Expected testRootPaths to be empty for --no-tests",
      );
    });

    it("does not run cleanup", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // First do a full build
      await hre.tasks.getTask("build").run();

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Create a stale artifact
      const staleArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "Stale.sol",
        "Stale.json",
      );
      await writeUtf8File(staleArtifactPath, "");

      await hre.tasks.getTask("build").run({ noTests: true });

      // Stale artifact should NOT be cleaned up (partial build)
      assert.equal(await exists(staleArtifactPath), true);
    });
  });

  describe("--no-contracts", function () {
    it("behaves like a partial build over all tests", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      const noContractsResult: {
        contractRootPaths: string[];
        testRootPaths: string[];
      } = await hre.tasks.getTask("build").run({ noContracts: true });

      assert.equal(
        noContractsResult.contractRootPaths.length,
        0,
        "Expected contractRootPaths to be empty for --no-contracts",
      );
      assert.ok(
        noContractsResult.testRootPaths.length > 0,
        "Expected testRootPaths to contain entries",
      );
    });

    it("still uses low-level scope 'contracts'", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // --no-contracts builds only test roots but uses scope: "contracts"
      await hre.tasks.getTask("build").run({ noContracts: true });

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Test artifacts should be in the main artifacts directory
      await readJsonFile(
        path.join(artifactsPath, "contracts", "Foo.t.sol", "FooTest.json"),
      );
      await readJsonFile(
        path.join(
          artifactsPath,
          "test",
          "OtherFooTest.sol",
          "OtherFooTest.json",
        ),
      );
    });

    it("does not run cleanup", async () => {
      await using project = await useTestProjectTemplate(basicProjectTemplate);
      const hre = await project.getHRE(unifiedTestsCompilationConfig);

      // First do a full build
      await hre.tasks.getTask("build").run();

      const artifactsPath =
        await hre.solidity.getArtifactsDirectory("contracts");

      // Create a stale artifact
      const staleArtifactPath = path.join(
        artifactsPath,
        "contracts",
        "Stale.sol",
        "Stale.json",
      );
      await writeUtf8File(staleArtifactPath, "");

      await hre.tasks.getTask("build").run({ noContracts: true });

      // Stale artifact should NOT be cleaned up (partial build)
      assert.equal(await exists(staleArtifactPath), true);
    });
  });
});
