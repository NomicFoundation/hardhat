import { getLatestSupportedSolcVersion } from "@nomicfoundation/edr";
import { assert, expect } from "chai";
import ci from "ci-info";
import * as fsExtra from "fs-extra";
import * as path from "path";
import sinon from "sinon";
import {
  TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
  TASK_COMPILE_SOLIDITY_READ_FILE,
} from "../../src/builtin-tasks/task-names";
import { SOLIDITY_FILES_CACHE_FILENAME } from "../../src/internal/constants";
import { ERRORS } from "../../src/internal/core/errors-list";
import { CompilationJobCreationErrorReason } from "../../src/types/builtin-tasks";
import { useEnvironment } from "../helpers/environment";
import { expectHardhatErrorAsync } from "../helpers/errors";
import { useFixtureProject } from "../helpers/project";
import { assertValidJson } from "../utils/json";
import { mockFile } from "../utils/mock-file";
import {
  getAllFilesMatchingSync,
  getRealPathSync,
} from "../../src/internal/util/fs-utils";

function assertFileExists(pathToFile: string) {
  assert.isTrue(
    fsExtra.existsSync(pathToFile),
    `Expected ${pathToFile} to exist`
  );
}

function assertBuildInfoExists(pathToDbg: string) {
  assertFileExists(pathToDbg);
  const { buildInfo } = fsExtra.readJsonSync(pathToDbg);
  assertFileExists(path.resolve(path.dirname(pathToDbg), buildInfo));
}

describe("compile task", function () {
  beforeEach(function () {
    fsExtra.removeSync("artifacts");
    fsExtra.removeSync(path.join("cache", SOLIDITY_FILES_CACHE_FILENAME));
  });

  function getBuildInfos() {
    return getAllFilesMatchingSync(
      getRealPathSync("artifacts/build-info"),
      (f) => f.endsWith(".json")
    );
  }

  describe("compile with latest solc version", function () {
    // The 'hardhat.config.js' and 'A.sol' files need to be updated each time a new solc version is released

    useFixtureProject("compilation-latest-solc-version");
    useEnvironment();

    it("should have the last version of solc in the 'hardhat.config.js' and 'A.sol' files", async function () {
      // Test to check that the last version of solc is being tested
      const userConfigSolcVersion = this.env.userConfig.solidity;

      const lastSolcVersion = getLatestSupportedSolcVersion();

      assert.equal(
        userConfigSolcVersion,
        lastSolcVersion,
        `The version of solc in the user config is not the last one. Expected '${lastSolcVersion}' but got '${userConfigSolcVersion}'. Did you forget to update the test?`
      );
    });

    it("should compile and emit artifacts using the latest solc version", async function () {
      await this.env.run("compile");

      assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json")
      );

      const buildInfos = getBuildInfos();
      assert.lengthOf(buildInfos, 1);

      assertValidJson(buildInfos[0]);
    });
  });

  describe("project with single file", function () {
    useFixtureProject("compilation-single-file");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run("compile");

      assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json")
      );

      const buildInfos = getBuildInfos();
      assert.lengthOf(buildInfos, 1);

      assertValidJson(buildInfos[0]);
    });
  });

  describe("project with an empty file", function () {
    useFixtureProject("compilation-empty-file");
    useEnvironment();

    it("should compile and emit no artifact", async function () {
      await this.env.run("compile");

      // the artifacts directory only has the build-info directory
      const artifactsDirectory = fsExtra.readdirSync("artifacts");
      assert.lengthOf(artifactsDirectory, 1);

      const buildInfos = getBuildInfos();
      assert.lengthOf(buildInfos, 0);
    });
  });

  describe("project with a single file with many contracts", function () {
    useFixtureProject("compilation-single-file-many-contracts");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run("compile");

      const artifactsDirectory = fsExtra.readdirSync(
        "artifacts/contracts/A.sol"
      );
      // 100 contracts, 2 files per contract
      assert.lengthOf(artifactsDirectory, 200);

      const buildInfos = getBuildInfos();
      assert.lengthOf(buildInfos, 1);

      assertValidJson(buildInfos[0]);
    });
  });

  describe("project with many files", function () {
    useFixtureProject("compilation-many-files");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run("compile");

      const contractsDirectory = fsExtra.readdirSync("artifacts/contracts");
      assert.lengthOf(contractsDirectory, 100);

      const buildInfos = getBuildInfos();
      assert.lengthOf(buildInfos, 1);

      assertValidJson(buildInfos[0]);
    });
  });

  describe("project with two files with different compiler versions", function () {
    useFixtureProject("compilation-two-files-different-versions");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run("compile");

      assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
      assertFileExists(path.join("artifacts", "contracts", "B.sol", "B.json"));
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json")
      );
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "B.sol", "B.dbg.json")
      );

      const buildInfos = getBuildInfos();
      assert.lengthOf(buildInfos, 2);
      assertValidJson(buildInfos[0]);
      assertValidJson(buildInfos[1]);
    });
  });

  describe("project with multiple different evm versions", function () {
    useFixtureProject("compilation-multiple-files-different-evm-versions");
    useEnvironment();

    it("should compile and show a message listing all the evm versions used", async function () {
      const spyFunctionConsoleLog = sinon.stub(console, "log");

      await this.env.run("compile");

      assert(
        spyFunctionConsoleLog.calledWith(
          "Compiled 4 Solidity files successfully (evm targets: paris, petersburg, shanghai, unknown evm version for solc version 0.4.11)."
        )
      );

      spyFunctionConsoleLog.restore();
    });
  });

  describe("TASK_COMPILE_SOLIDITY_READ_FILE", function () {
    describe("Import folder", () => {
      const folderName = "compilation-single-file";
      useFixtureProject(folderName);
      useEnvironment();

      it("should throw an error because a directory is trying to be imported", async function () {
        const absolutePath = `${__dirname}/../fixture-projects/${folderName}/contracts/`;

        await expectHardhatErrorAsync(
          async () => {
            await this.env.run(TASK_COMPILE_SOLIDITY_READ_FILE, {
              absolutePath,
            });
          },
          ERRORS.GENERAL.INVALID_READ_OF_DIRECTORY,
          `HH22: Invalid file path ${absolutePath}. Attempting to read a directory instead of a file.`
        );
      });
    });

    describe("A non specific Hardhat error is thrown (expected default error)", () => {
      const folderName = "compilation-import-non-existing-file-from-path";
      useFixtureProject(folderName);
      useEnvironment();

      it("should throw an error because the file does not exist", async function () {
        const absolutePath = `${__dirname}/../fixture-projects/${folderName}/contracts/file.sol`;

        await expect(
          this.env.run(TASK_COMPILE_SOLIDITY_READ_FILE, { absolutePath })
        )
          .to.be.rejectedWith(
            `ENOENT: no such file or directory, lstat '${absolutePath}'`
          )
          .and.eventually.have.property("name", "Error"); // Default js error
      });
    });
  });

  describe("compilation jobs failure message", function () {
    useFixtureProject("compilation-single-file");
    useEnvironment();

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

      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `The Solidity version pragma statement in these files doesn't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

  * contracts/Foo.sol (^0.5.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `The Solidity version pragma statement in these files doesn't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

  * contracts/Foo.sol (^0.5.0)
  * contracts/Bar.sol (^0.5.1)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
      );
    });

    it("should return a proper message for a non compatible overridden solc error with a single file", async function () {
      const Foo = mockFile({
        sourceName: "contracts/Foo.sol",
        pragma: "^0.5.0",
      });

      const compilationJobsCreationErrors = [
        {
          reason:
            CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION,
          file: Foo,
        },
      ];
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `The compiler version for the following files is fixed through an override in your config file to a version that is incompatible with their Solidity version pragmas.

  * contracts/Foo.sol (^0.5.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar.sol (^0.6.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar1.sol (^0.6.0) and contracts/Bar2.sol (^0.6.1)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 1 other file. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files import other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) imports contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 2 other files. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar.sol (^0.6.0)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar1.sol (^0.6.0) and contracts/Bar2.sol (^0.6.1)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 1 other file. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files depend on other files that use a different and incompatible version of Solidity:

  * contracts/Foo.sol (^0.5.0) depends on contracts/Bar1.sol (^0.6.0), contracts/Bar2.sol (^0.6.1) and 2 other files. Use --verbose to see the full list.

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files and its dependencies cannot be compiled with your config. This can happen because they have incompatible Solidity pragmas, or don't match any of your configured Solidity compilers.

  * contracts/Foo.sol

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        reasons,
        `These files and its dependencies cannot be compiled with your config. This can happen because they have incompatible Solidity pragmas, or don't match any of your configured Solidity compilers.

  * contracts/Foo.sol

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
            CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDDEN_SOLC_VERSION,
          file: Foo1,
        },
      ];
      const reasons = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS,
        {
          compilationJobsCreationErrors,
        }
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
`
      );
    });
  });

  describe("old versions of solidity", function () {
    useFixtureProject("old-solidity-versions");

    describe("project with an old version of solidity", function () {
      useEnvironment("old-solidity-version.js");

      it("should throw an error", async function () {
        await expectHardhatErrorAsync(async () => {
          await this.env.run("compile");
        }, ERRORS.BUILTIN_TASKS.COMPILE_TASK_UNSUPPORTED_SOLC_VERSION);
      });
    });

    describe("project with an old version of solidity (multiple compilers)", function () {
      useEnvironment("old-solidity-version-multiple-compilers.js");

      it("should throw an error", async function () {
        await expectHardhatErrorAsync(async () => {
          await this.env.run("compile");
        }, ERRORS.BUILTIN_TASKS.COMPILE_TASK_UNSUPPORTED_SOLC_VERSION);
      });
    });

    describe("project with an old version of solidity in an override", function () {
      useEnvironment("old-solidity-version-in-override.js");

      it("should throw an error", async function () {
        await expectHardhatErrorAsync(async () => {
          await this.env.run("compile");
        }, ERRORS.BUILTIN_TASKS.COMPILE_TASK_UNSUPPORTED_SOLC_VERSION);
      });
    });
  });

  describe("project where two contracts import the same dependency", function () {
    useFixtureProject("consistent-build-info-names");
    useEnvironment();

    it("should always produce the same build-info name", async function () {
      await this.env.run("compile");

      const buildInfos = getBuildInfos();
      assert.lengthOf(buildInfos, 1);

      const expectedBuildInfoName = buildInfos[0];

      const runs = ci.isCI ? 10 : 100;

      for (let i = 0; i < runs; i++) {
        await this.env.run("clean");
        await this.env.run("compile");

        const newBuildInfos = getBuildInfos();
        assert.lengthOf(newBuildInfos, 1);

        assert.equal(newBuildInfos[0], expectedBuildInfoName);
      }
    });
  });

  describe("project with files importing dependencies", function () {
    useFixtureProject("compilation-contract-with-deps");
    useEnvironment();

    it("should not remove the build-info if it is still referenced by an external library", async function () {
      await this.env.run("compile");

      const pathToContractA = path.join("contracts", "A.sol");
      let contractA = fsExtra.readFileSync(pathToContractA, "utf-8");
      contractA = contractA.replace("contract A", "contract B");
      fsExtra.writeFileSync(pathToContractA, contractA, "utf-8");

      /**
       * The _validArtifacts variable is not cleared when running the compile
       * task twice in the same process, leading to an invalid output. This
       * issue is not encountered when running the task from the CLI as each
       * command operates as a separate process. To resolve this, the private
       * variable should be cleared after each run of the compile task.
       */
      // eslint-disable-next-line @typescript-eslint/dot-notation
      (this.env.artifacts as any)["_validArtifacts"] = [];

      await this.env.run("compile");

      contractA = contractA.replace("contract B", "contract A");
      fsExtra.writeFileSync(pathToContractA, contractA, "utf-8");

      // asserts
      const pathToBuildInfoB = path.join(
        "artifacts",
        "contracts",
        "A.sol",
        "B.dbg.json"
      );
      assertBuildInfoExists(pathToBuildInfoB);
      const pathToBuildInfoConsole = path.join(
        "artifacts",
        "dependency",
        "contracts",
        "console.sol",
        "console.dbg.json"
      );
      assertBuildInfoExists(pathToBuildInfoConsole);
    });

    it("should not remove the build-info if it is still referenced by another local contract", async function () {
      await this.env.run("compile");

      const pathToContractC = path.join("contracts", "C.sol");
      let contractC = fsExtra.readFileSync(pathToContractC, "utf-8");
      contractC = contractC.replace("contract C", "contract D");
      fsExtra.writeFileSync(pathToContractC, contractC, "utf-8");

      /**
       * The _validArtifacts variable is not cleared when running the compile
       * task twice in the same process, leading to an invalid output. This
       * issue is not encountered when running the task from the CLI as each
       * command operates as a separate process. To resolve this, the private
       * variable should be cleared after each run of the compile task.
       */
      // eslint-disable-next-line @typescript-eslint/dot-notation
      (this.env.artifacts as any)["_validArtifacts"] = [];

      await this.env.run("compile");

      contractC = contractC.replace("contract D", "contract C");
      fsExtra.writeFileSync(pathToContractC, contractC, "utf-8");

      // asserts
      const pathToBuildInfoC = path.join(
        "artifacts",
        "contracts",
        "C.sol",
        "D.dbg.json"
      );
      assertBuildInfoExists(pathToBuildInfoC);
      const pathToBuildInfoE = path.join(
        "artifacts",
        "contracts",
        "E.sol",
        "E.dbg.json"
      );
      assertBuildInfoExists(pathToBuildInfoE);
    });
  });

  describe("project with remappings", function () {
    useFixtureProject("compilation-remappings");
    useEnvironment();

    it("should compile fine", async function () {
      await this.env.run("compile");

      assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
      assertFileExists(path.join("artifacts", "foo", "Foo.sol", "Foo.json"));
    });
  });

  describe("project with ambiguous remappings", function () {
    useFixtureProject("compilation-ambiguous-remappings");
    useEnvironment();

    it("should throw an error", async function () {
      await expectHardhatErrorAsync(
        () => this.env.run("compile"),
        ERRORS.RESOLVER.AMBIGUOUS_SOURCE_NAMES,
        /Two different source names \('\w+\/Foo.sol' and '\w+\/Foo.sol'\) resolve to the same file/
      );
    });
  });
});
