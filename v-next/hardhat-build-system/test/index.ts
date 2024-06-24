/* eslint-disable @typescript-eslint/no-non-null-assertion -- TODO: remove this */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import ci from "ci-info";
import sinon from "sinon";

import { BuildSystem } from "../src/index.js";
import { CompilationJobCreationErrorReason } from "../src/internal/types/builtin-tasks/index.js";
import {
  getAllFilesMatchingSync,
  getRealPathSync,
} from "../src/internal/utils/fs-utils.js";

import {
  cleanFixtureProjectDir,
  expectHardhatErrorAsync,
  mockFile,
  resolveConfig,
  useFixtureProject,
} from "./helpers.js";

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

async function assertFileExists(pathToFile: string) {
  assert.equal(existsSync(pathToFile), true, `Expected ${pathToFile} to exist`);
}

async function assertBuildInfoExists(pathToDbg: string) {
  await assertFileExists(pathToDbg);
  const { buildInfo } = JSON.parse((await fs.readFile(pathToDbg)).toString());
  await assertFileExists(path.resolve(path.dirname(pathToDbg), buildInfo));
}

function getBuildInfos(): string[] {
  return getAllFilesMatchingSync(getRealPathSync("artifacts/build-info"), (f) =>
    f.endsWith(".json"),
  );
}

async function assertValidJson(pathToJson: string) {
  const content = (await fs.readFile(pathToJson)).toString();

  try {
    JSON.parse(content);
  } catch (e) {
    assert.fail(`Invalid json file: ${pathToJson}`);
  }
}

describe("build-system", () => {
  // TODO: should we also move here the tests to check that the last solidity version is properly added?
  // It's this commented code:
  // describe("compile with latest solc version", function () {
  //   // The 'hardhat.config.js' and 'A.sol' files need to be updated each time a new solc version is released

  //   useFixtureProject("compilation-latest-solc-version");
  //   useEnvironment();

  //   it("should have the last version of solc in the 'hardhat.config.js' and 'A.sol' files", async function () {
  //     // Test to check that the last version of solc is being tested
  //     const userConfigSolcVersion = this.env.userConfig.solidity;

  //     const lastSolcVersion = getLatestSupportedVersion();

  //     assert.equal(
  //       userConfigSolcVersion,
  //       lastSolcVersion,
  //       `The version of solc in the user config is not the last one. Expected '${lastSolcVersion}' but got '${userConfigSolcVersion}'. Did you forget to update the test?`
  //     );
  //   });

  //   it("should compile and emit artifacts using the latest solc version", async function () {
  //     await this.env.run("compile");

  //     assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
  //     assertBuildInfoExists(
  //       path.join("artifacts", "contracts", "A.sol", "A.dbg.json")
  //     );

  //     const buildInfos = getBuildInfos();
  //     assert.lengthOf(buildInfos, 1);

  //     assertValidJson(buildInfos[0]);
  //   });
  // });

  describe("project with single file", function () {
    useFixtureProject("compilation-single-file");

    it("should compile and emit artifacts", async function () {
      const config = await resolveConfig();

      const buildSystem = new BuildSystem(config);
      await buildSystem.build();

      await assertFileExists(
        path.join("artifacts", "contracts", "A.sol", "A.json"),
      );
      await assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json"),
      );

      const buildInfos = getBuildInfos();
      assert.equal(buildInfos.length, 1);
      await assertValidJson(buildInfos[0]!);
    });
  });

  describe("project with an empty file", function () {
    useFixtureProject("compilation-empty-file");

    it("should compile and emit no artifact", async function () {
      const config = await resolveConfig();

      const buildSystem = new BuildSystem(config);
      await buildSystem.build();

      // the artifacts directory only has the build-info directory
      const artifactsDirectory = await fs.readdir("artifacts");
      assert.equal(
        artifactsDirectory.length,
        1,
        "The length should be the same",
      );

      const buildInfos = getBuildInfos();
      assert.equal(buildInfos.length, 0);
    });
  });

  describe("project with a single file with many contracts", function () {
    useFixtureProject("compilation-single-file-many-contracts");

    it("should compile and emit artifacts", async function () {
      const config = await resolveConfig();

      const buildSystem = new BuildSystem(config);
      await buildSystem.build();

      const artifactsDirectory = await fs.readdir("artifacts/contracts/A.sol");
      // 100 contracts, 2 files per contract
      assert.equal(artifactsDirectory.length, 200);

      const buildInfos = getBuildInfos();
      assert.equal(buildInfos.length, 1);
      await assertValidJson(buildInfos[0]!);
    });
  });

  describe("project with many files", function () {
    useFixtureProject("compilation-many-files");

    it("should compile and emit artifacts", async function () {
      const config = await resolveConfig();

      const buildSystem = new BuildSystem(config);
      await buildSystem.build();

      const contractsDirectory = await fs.readdir("artifacts/contracts");
      assert.equal(contractsDirectory.length, 100);

      const buildInfos = getBuildInfos();
      assert.equal(buildInfos.length, 1);

      await assertValidJson(buildInfos[0]!);
    });
  });

  describe("project with two files with different compiler versions", function () {
    useFixtureProject("compilation-two-files-different-versions");

    it("should compile and emit artifacts", async function () {
      const config = await resolveConfig();

      const buildSystem = new BuildSystem(config);
      await buildSystem.build();

      await assertFileExists(
        path.join("artifacts", "contracts", "A.sol", "A.json"),
      );
      await assertFileExists(
        path.join("artifacts", "contracts", "B.sol", "B.json"),
      );
      await assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json"),
      );
      await assertBuildInfoExists(
        path.join("artifacts", "contracts", "B.sol", "B.dbg.json"),
      );

      const buildInfos = getBuildInfos();
      assert.equal(buildInfos.length, 2);
      await assertValidJson(buildInfos[0]!);
      await assertValidJson(buildInfos[1]!);
    });
  });

  describe("project with multiple different evm versions", function () {
    useFixtureProject("compilation-multiple-files-different-evm-versions");

    it("should compile and show a message listing all the evm versions used", async function () {
      const spyFunctionConsoleLog = sinon.stub(console, "log");

      const config = await resolveConfig();

      const buildSystem = new BuildSystem(config);
      await buildSystem.build();

      const calledWithExpectedMessage =
        "Compiled 4 Solidity files successfully (evm targets: paris, petersburg, shanghai, unknown evm version for solc version 0.4.11).";
      assert(
        spyFunctionConsoleLog.calledWith(calledWithExpectedMessage),
        `expected console.log to be called with "${calledWithExpectedMessage}" but got "${spyFunctionConsoleLog.args[0][0]}"`,
      );

      spyFunctionConsoleLog.restore();
    });
  });

  describe("TASK_COMPILE_SOLIDITY_READ_FILE", function () {
    describe("Import folder", () => {
      const folderName = "compilation-single-file";
      useFixtureProject(folderName);

      it("should throw an error because a directory is trying to be imported", async function () {
        const absolutePath = `${_dirname}/fixture-projects/${folderName}/contracts/`;

        const config = await resolveConfig();
        const buildSystem = new BuildSystem(config);

        await expectHardhatErrorAsync(async () => {
          await buildSystem.solidityReadFile(absolutePath);
        }, HardhatError.ERRORS.GENERAL.INVALID_READ_OF_DIRECTORY);
      });
    });

    describe("A non specific Hardhat error is thrown (expected default error)", () => {
      const folderName = "compilation-import-non-existing-file-from-path";
      useFixtureProject(folderName);

      it("should throw an error because the file does not exist", async function () {
        const absolutePath = `${_dirname}/fixture-projects/${folderName}/contracts/file.sol`;

        const config = await resolveConfig();
        const buildSystem = new BuildSystem(config);

        await assert.rejects(async () => {
          await buildSystem.solidityReadFile(absolutePath);
        }, `Error: ENOENT: no such file or directory, lstat '${absolutePath}'`);
      });
    });
  });

  describe("old versions of solidity", function () {
    useFixtureProject("old-solidity-versions");

    describe("project with an old version of solidity", function () {
      it("should throw an error", async function () {
        const config = await resolveConfig("old-solidity-version.js");
        const buildSystem = new BuildSystem(config);

        await expectHardhatErrorAsync(async () => {
          await buildSystem.build();
        }, HardhatError.ERRORS.BUILTIN_TASKS.COMPILE_TASK_UNSUPPORTED_SOLC_VERSION);
      });
    });

    describe("project with an old version of solidity (multiple compilers)", function () {
      it("should throw an error", async function () {
        const config = await resolveConfig(
          "old-solidity-version-multiple-compilers.js",
        );
        const buildSystem = new BuildSystem(config);

        await expectHardhatErrorAsync(async () => {
          await buildSystem.build();
        }, HardhatError.ERRORS.BUILTIN_TASKS.COMPILE_TASK_UNSUPPORTED_SOLC_VERSION);
      });
    });

    describe("project with an old version of solidity in an override", function () {
      it("should throw an error", async function () {
        const config = await resolveConfig(
          "old-solidity-version-in-override.js",
        );
        const buildSystem = new BuildSystem(config);

        await expectHardhatErrorAsync(async () => {
          await buildSystem.build();
        }, HardhatError.ERRORS.BUILTIN_TASKS.COMPILE_TASK_UNSUPPORTED_SOLC_VERSION);
      });
    });
  });

  describe("project where two contracts import the same dependency", function () {
    const folderName = "consistent-build-info-names";
    useFixtureProject(folderName);

    it("should always produce the same build-info name", async function () {
      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      await buildSystem.build({
        tasksOverrides: {
          taskCompileSolidityLogCompilationResult: async () => {},
        },
      });

      const buildInfos = getBuildInfos();
      assert.equal(buildInfos.length, 1);

      const expectedBuildInfoName = buildInfos[0];

      const runs = ci.isCI ? 10 : 100;

      for (let i = 0; i < runs; i++) {
        cleanFixtureProjectDir(folderName);

        await buildSystem.build({
          tasksOverrides: {
            taskCompileSolidityLogCompilationResult: async () => {},
          },
        });

        const newBuildInfos = getBuildInfos();
        assert.equal(newBuildInfos.length, 1);

        assert.equal(newBuildInfos[0], expectedBuildInfoName);
      }
    });
  });

  describe("project with files importing dependencies", function () {
    useFixtureProject("compilation-contract-with-deps");

    it("should not remove the build-info if it is still referenced by an external library", async function () {
      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      // This project is compiled from scratch multiple times in the same test, which
      // produces a lot of logs. We override this task to omit those logs.
      await buildSystem.build({
        tasksOverrides: {
          taskCompileSolidityLogCompilationResult: async () => {},
        },
      });

      const pathToContractA = path.join("contracts", "A.sol");
      let contractA = await fs.readFile(pathToContractA, "utf-8");
      contractA = contractA.replace("contract A", "contract B");
      await fs.writeFile(pathToContractA, contractA, "utf-8");

      // TODO: check if artifacts logic is moved from the 'build' method
      /**
       * The _validArtifacts variable is not cleared when running the compile
       * task twice in the same process, leading to an invalid output. This
       * issue is not encountered when running the task from the CLI as each
       * command operates as a separate process. To resolve this, the private
       * variable should be cleared after each run of the compile task.
       */
      // eslint-disable-next-line @typescript-eslint/dot-notation -- TODO
      // (this.env.artifacts as any)["_validArtifacts"] = [];

      await buildSystem.build({
        tasksOverrides: {
          taskCompileSolidityLogCompilationResult: async () => {},
        },
      });

      contractA = contractA.replace("contract B", "contract A");
      await fs.writeFile(pathToContractA, contractA, "utf-8");

      // asserts
      const pathToBuildInfoB = path.join(
        "artifacts",
        "contracts",
        "A.sol",
        "B.dbg.json",
      );
      await assertBuildInfoExists(pathToBuildInfoB);

      const pathToBuildInfoConsole = path.join(
        "artifacts",
        "dependency",
        "contracts",
        "console.sol",
        "console.dbg.json",
      );
      await assertBuildInfoExists(pathToBuildInfoConsole);
    });

    it("should not remove the build-info if it is still referenced by another local contract", async function () {
      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      // This project is compiled from scratch multiple times in the same test, which
      // produces a lot of logs. We override this task to omit those logs.
      await buildSystem.build({
        tasksOverrides: {
          taskCompileSolidityLogCompilationResult: async () => {},
        },
      });

      const pathToContractC = path.join("contracts", "C.sol");
      let contractC = await fs.readFile(pathToContractC, "utf-8");
      contractC = contractC.replace("contract C", "contract D");
      await fs.writeFile(pathToContractC, contractC, "utf-8");

      // TODO: check if artifacts logic is moved from the 'build' method
      /**
       * The _validArtifacts variable is not cleared when running the compile
       * task twice in the same process, leading to an invalid output. This
       * issue is not encountered when running the task from the CLI as each
       * command operates as a separate process. To resolve this, the private
       * variable should be cleared after each run of the compile task.
       */
      // eslint-disable-next-line @typescript-eslint/dot-notation -- TODO
      // (this.env.artifacts as any)["_validArtifacts"] = [];

      await buildSystem.build({
        tasksOverrides: {
          taskCompileSolidityLogCompilationResult: async () => {},
        },
      });

      contractC = contractC.replace("contract D", "contract C");
      await fs.writeFile(pathToContractC, contractC, "utf-8");

      // asserts
      const pathToBuildInfoC = path.join(
        "artifacts",
        "contracts",
        "C.sol",
        "D.dbg.json",
      );
      await assertBuildInfoExists(pathToBuildInfoC);

      const pathToBuildInfoE = path.join(
        "artifacts",
        "contracts",
        "E.sol",
        "E.dbg.json",
      );
      await assertBuildInfoExists(pathToBuildInfoE);
    });
  });

  describe("compilation jobs failure message", function () {
    useFixtureProject("compilation-single-file");

    it("should return a proper message for a non compatible solc error with a single file", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
          file: Foo,
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `The Solidity version pragma statement in these files doesn't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

  * contracts/Foo.sol (^0.5.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for a non compatible solc error with two files", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar = mockFile({
        sourceName: "contracts/Bar.sol",
        pragma: "^0.5.1",
      });

      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
          file: Foo,
        },
        {
          reason:
            CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
          file: Bar,
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `The Solidity version pragma statement in these files doesn't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

  * contracts/Foo.sol (^0.5.0)
  * contracts/Bar.sol (^0.5.1)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for a non compatible overriden solc error with a single file", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });

      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION,
          file: Foo,
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `The compiler version for the following files is fixed through an override in your config file to a version that is incompatible with their Solidity version pragmas.

  * contracts/Foo.sol (^0.5.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for a non compatible import error with a single file", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar = mockFile({
        sourceName: "contracts/Bar.sol",
        pragma: "^0.6.0",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.DIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleDirectImports: [Bar],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar.sol (^0.6.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for two non compatible imports", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar1 = mockFile({
        sourceName: "contracts/Bar1.sol",
        pragma: "^0.6.0",
      });
      const Bar2 = mockFile({
        sourceName: "contracts/Bar2.sol",
        pragma: "^0.6.1",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.DIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleDirectImports: [Bar1, Bar2],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar1.sol (^0.6.0) and contracts/Bar2.sol (^0.6.1)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for three non compatible imports", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar1 = mockFile({
        sourceName: "contracts/Bar1.sol",
        pragma: "^0.6.0",
      });
      const Bar2 = mockFile({
        sourceName: "contracts/Bar2.sol",
        pragma: "^0.6.1",
      });
      const Bar3 = mockFile({
        sourceName: "contracts/Bar3.sol",
        pragma: "^0.6.2",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.DIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleDirectImports: [Bar1, Bar2, Bar3],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 1 other file. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for four non compatible imports", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar1 = mockFile({
        sourceName: "contracts/Bar1.sol",
        pragma: "^0.6.0",
      });
      const Bar2 = mockFile({
        sourceName: "contracts/Bar2.sol",
        pragma: "^0.6.1",
      });
      const Bar3 = mockFile({
        sourceName: "contracts/Bar3.sol",
        pragma: "^0.6.2",
      });
      const Bar4 = mockFile({
        sourceName: "contracts/Bar4.sol",
        pragma: "^0.6.3",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.DIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleDirectImports: [Bar1, Bar2, Bar3, Bar4],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 2 other files. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for an indirect non compatible import error with a single file", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar = mockFile({
        sourceName: "contracts/Bar.sol",
        pragma: "^0.6.0",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.INDIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleIndirectImports: [
              {
                dependency: Bar,
                path: [],
              },
            ],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar.sol (^0.6.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for two indirect non compatible import errors", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar1 = mockFile({
        sourceName: "contracts/Bar1.sol",
        pragma: "^0.6.0",
      });
      const Bar2 = mockFile({
        sourceName: "contracts/Bar2.sol",
        pragma: "^0.6.1",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.INDIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleIndirectImports: [
              { dependency: Bar1, path: [] },
              { dependency: Bar2, path: [] },
            ],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar1.sol (^0.6.0) and contracts/Bar2.sol (^0.6.1)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for three indirect non compatible import errors", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar1 = mockFile({
        sourceName: "contracts/Bar1.sol",
        pragma: "^0.6.0",
      });
      const Bar2 = mockFile({
        sourceName: "contracts/Bar2.sol",
        pragma: "^0.6.1",
      });
      const Bar3 = mockFile({
        sourceName: "contracts/Bar3.sol",
        pragma: "^0.6.2",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.INDIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleIndirectImports: [
              { dependency: Bar1, path: [] },
              { dependency: Bar2, path: [] },
              { dependency: Bar3, path: [] },
            ],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 1 other file. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for four indirect non compatible import errors", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const Bar1 = mockFile({
        sourceName: "contracts/Bar1.sol",
        pragma: "^0.6.0",
      });
      const Bar2 = mockFile({
        sourceName: "contracts/Bar2.sol",
        pragma: "^0.6.1",
      });
      const Bar3 = mockFile({
        sourceName: "contracts/Bar3.sol",
        pragma: "^0.6.2",
      });
      const Bar4 = mockFile({
        sourceName: "contracts/Bar4.sol",
        pragma: "^0.6.3",
      });
      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.INDIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo,
          extra: {
            incompatibleIndirectImports: [
              { dependency: Bar1, path: [] },
              { dependency: Bar2, path: [] },
              { dependency: Bar3, path: [] },
              { dependency: Bar4, path: [] },
            ],
          },
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 2 other files. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for other kind of error with a single file", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const compilationJobsCreationErrors = [
        {
          reason: CompilationJobCreationErrorReason.OTHER_ERROR,
          file: Foo,
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files and its dependencies cannot be compiled with your config. This can happen because they have incompatible Solidity pragmas, or don't match any of your configured Solidity compilers.

  * contracts/Foo.sol

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return a proper message for an unknown kind of error with a single file", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });
      const compilationJobsCreationErrors: any = [
        {
          reason: "unknown",
          file: Foo,
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `These files and its dependencies cannot be compiled with your config. This can happen because they have incompatible Solidity pragmas, or don't match any of your configured Solidity compilers.

  * contracts/Foo.sol

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });

    it("should return multiple errors in order", async function () {
      const Foo1 = mockFile({
        sourceName: "contracts/Foo1.sol",
        pragma: "^0.5.0",
      });
      const Foo2 = mockFile({
        sourceName: "contracts/Foo2.sol",
        pragma: "^0.5.0",
      });
      const Foo3 = mockFile({
        sourceName: "contracts/Foo3.sol",
        pragma: "^0.5.0",
      });
      const Foo4 = mockFile({
        sourceName: "contracts/Foo4.sol",
        pragma: "^0.5.0",
      });
      const Foo5 = mockFile({
        sourceName: "contracts/Foo5.sol",
        pragma: "^0.5.0",
      });
      const Bar = mockFile({
        sourceName: "contracts/Bar.sol",
        pragma: "^0.6.0",
      });

      const compilationJobsCreationErrors = [
        {
          reason: CompilationJobCreationErrorReason.OTHER_ERROR,
          file: Foo4,
        },
        {
          reason:
            CompilationJobCreationErrorReason.NO_COMPATIBLE_SOLC_VERSION_FOUND,
          file: Foo2,
        },
        {
          reason:
            CompilationJobCreationErrorReason.DIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo3,
          extra: {
            incompatibleDirectImports: [Bar],
          },
        },
        {
          reason:
            CompilationJobCreationErrorReason.INDIRECTLY_IMPORTS_INCOMPATIBLE_FILE,
          file: Foo5,
          extra: {
            incompatibleIndirectImports: [{ dependency: Bar, path: [] }],
          },
        },
        {
          reason:
            CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION,
          file: Foo1,
        },
      ];

      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      const reasons =
        await buildSystem.solidityGetCompilationJobsFailureReasons(
          compilationJobsCreationErrors,
        );

      assert.equal(
        reasons,
        `The compiler version for the following files is fixed through an override in your config file to a version that is incompatible with their Solidity version pragmas.

  * contracts/Foo1.sol (^0.5.0)

The Solidity version pragma statement in these files doesn't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

  * contracts/Foo2.sol (^0.5.0)

These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo3.sol (^0.5.0) imports contracts/Bar.sol (^0.6.0)

These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo5.sol (^0.5.0) depends on contracts/Bar.sol (^0.6.0)

These files and its dependencies cannot be compiled with your config. This can happen because they have incompatible Solidity pragmas, or don't match any of your configured Solidity compilers.

  * contracts/Foo4.sol

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`,
      );
    });
  });

  describe("project with remappings", function () {
    useFixtureProject("compilation-remappings");

    it("should compile fine", async function () {
      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      await buildSystem.build({
        tasksOverrides: {
          taskCompileGetRemappings: async () => {
            return {
              "foo/": "node_modules/foo/contracts/",
            };
          },
        },
      });

      await assertFileExists(
        path.join("artifacts", "contracts", "A.sol", "A.json"),
      );
      await assertFileExists(
        path.join("artifacts", "foo", "Foo.sol", "Foo.json"),
      );
    });
  });

  describe("project with ambiguous remappings", function () {
    useFixtureProject("compilation-ambiguous-remappings");

    it("should throw an error", async function () {
      const config = await resolveConfig();
      const buildSystem = new BuildSystem(config);

      await expectHardhatErrorAsync(
        async () =>
          buildSystem.build({
            tasksOverrides: {
              taskCompileGetRemappings: async () => {
                return {
                  "foo/": "node_modules/foo/contracts/",
                  "bar/": "node_modules/foo/contracts/",
                };
              },
            },
          }),
        HardhatError.ERRORS.RESOLVER.AMBIGUOUS_SOURCE_NAMES,
        /Two different source names \('\w+\/Foo.sol' and '\w+\/Foo.sol'\) resolve to the same file/,
      );
    });
  });
});
