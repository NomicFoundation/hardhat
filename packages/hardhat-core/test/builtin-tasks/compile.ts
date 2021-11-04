import { assert } from "chai";
import * as fsExtra from "fs-extra";
import * as path from "path";

import { TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURE_REASONS } from "../../src/builtin-tasks/task-names";
import { SOLIDITY_FILES_CACHE_FILENAME } from "../../src/internal/constants";
import { ERRORS } from "../../src/internal/core/errors-list";
import { globSync } from "../../src/internal/util/glob";
import { CompilationJobCreationErrorReason } from "../../src/types/builtin-tasks";
import { useEnvironment } from "../helpers/environment";
import { expectHardhatErrorAsync } from "../helpers/errors";
import { useFixtureProject } from "../helpers/project";
import { mockFile } from "../utils/mock-file";

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

  describe("project with single file", function () {
    useFixtureProject("compilation-single-file");
    useEnvironment();

    it("should compile and emit artifacts", async function () {
      await this.env.run("compile");

      assertFileExists(path.join("artifacts", "contracts", "A.sol", "A.json"));
      assertBuildInfoExists(
        path.join("artifacts", "contracts", "A.sol", "A.dbg.json")
      );
      assert.lengthOf(globSync("artifacts/build-info/*.json"), 1);
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
      assert.lengthOf(globSync("artifacts/build-info/*.json"), 2);
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
        `The Solidity version pragma statement in these files don't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

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
        `The Solidity version pragma statement in these files don't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

  * contracts/Foo.sol (^0.5.0)
  * contracts/Bar.sol (^0.5.1)

To learn more, run the command again with --verbose

Read about compiler configuration at https://hardhat.org/config
`
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
            CompilationJobCreationErrorReason.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION,
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

The Solidity version pragma statement in these files don't match any of the configured compilers in your config. Change the pragma or configure additional compiler versions in your hardhat config.

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
});
