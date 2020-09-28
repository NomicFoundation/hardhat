import { assert } from "chai";
import * as fsExtra from "fs-extra";
import * as path from "path";

import { TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE } from "../../src/builtin-tasks/task-names";
import {
  CompilationJobCreationError,
  CompilationJobsCreationErrors,
} from "../../src/builtin-tasks/types";
import { SOLIDITY_FILES_CACHE_FILENAME } from "../../src/internal/constants";
import { globSync } from "../../src/internal/util/glob";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

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
      const compilationJobsCreationErrors: CompilationJobsCreationErrors = {
        [CompilationJobCreationError.NO_COMPATIBLE_SOLC_VERSION_FOUND]: [
          "contracts/Foo.sol",
        ],
      };
      const message = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        message,
        `The project couldn't be compiled, see reasons below.

The pragma statement in these files don't match any of the configured compilers
in your config. Change the pragma or configure additional compiler versions in
your hardhat config.

* contracts/Foo.sol

Learn more about compiler configuration at https://usehardhat.com/configuration
`
      );
    });

    it("should return a proper message for a non compatible solc error with two files", async function () {
      const compilationJobsCreationErrors: CompilationJobsCreationErrors = {
        [CompilationJobCreationError.NO_COMPATIBLE_SOLC_VERSION_FOUND]: [
          "contracts/Foo.sol",
          "contracts/Bar.sol",
        ],
      };
      const message = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        message,
        `The project couldn't be compiled, see reasons below.

The pragma statement in these files don't match any of the configured compilers
in your config. Change the pragma or configure additional compiler versions in
your hardhat config.

* contracts/Foo.sol
* contracts/Bar.sol

Learn more about compiler configuration at https://usehardhat.com/configuration
`
      );
    });

    it("should return a proper message for a non compatible overriden solc error with a single file", async function () {
      const compilationJobsCreationErrors: CompilationJobsCreationErrors = {
        [CompilationJobCreationError.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION]: [
          "contracts/Foo.sol",
        ],
      };
      const message = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        message,
        `The project couldn't be compiled, see reasons below.

The compiler version for the following files is fixed through an override in your
config file to a version that is incompatible with their version pragmas.

* contracts/Foo.sol

Learn more about compiler configuration at https://usehardhat.com/configuration
`
      );
    });

    it("should return a proper message for a non compatible import error with a single file", async function () {
      const compilationJobsCreationErrors: CompilationJobsCreationErrors = {
        [CompilationJobCreationError.IMPORTS_INCOMPATIBLE_FILE]: [
          "contracts/Foo.sol",
        ],
      };
      const message = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        message,
        `The project couldn't be compiled, see reasons below.

These files import other files that use a different and incompatible version of Solidity:

* contracts/Foo.sol

Learn more about compiler configuration at https://usehardhat.com/configuration
`
      );
    });

    it("should return a proper message for other kind of error with a single file", async function () {
      const compilationJobsCreationErrors: CompilationJobsCreationErrors = {
        [CompilationJobCreationError.OTHER_ERROR]: ["contracts/Foo.sol"],
      };
      const message = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        message,
        `The project couldn't be compiled, see reasons below.

These files and its dependencies cannot be compiled with your config:

* contracts/Foo.sol

Learn more about compiler configuration at https://usehardhat.com/configuration
`
      );
    });

    it("should return a proper message for an unknown kind of error with a single file", async function () {
      const compilationJobsCreationErrors: any = {
        unknown: ["contracts/Foo.sol"],
      };
      const message = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        message,
        `The project couldn't be compiled, see reasons below.

These files and its dependencies cannot be compiled with your config:

* contracts/Foo.sol

Learn more about compiler configuration at https://usehardhat.com/configuration
`
      );
    });

    it("should return multiple errors in order", async function () {
      const compilationJobsCreationErrors: CompilationJobsCreationErrors = {
        [CompilationJobCreationError.OTHER_ERROR]: ["contracts/Foo4.sol"],
        [CompilationJobCreationError.NO_COMPATIBLE_SOLC_VERSION_FOUND]: [
          "contracts/Foo2.sol",
        ],
        [CompilationJobCreationError.IMPORTS_INCOMPATIBLE_FILE]: [
          "contracts/Foo3.sol",
        ],
        [CompilationJobCreationError.INCOMPATIBLE_OVERRIDEN_SOLC_VERSION]: [
          "contracts/Foo1.sol",
        ],
      };
      const message = await this.env.run(
        TASK_COMPILE_SOLIDITY_GET_COMPILATION_JOBS_FAILURES_MESSAGE,
        {
          compilationJobsCreationErrors,
        }
      );

      assert.equal(
        message,
        `The project couldn't be compiled, see reasons below.

The compiler version for the following files is fixed through an override in your
config file to a version that is incompatible with their version pragmas.

* contracts/Foo1.sol

The pragma statement in these files don't match any of the configured compilers
in your config. Change the pragma or configure additional compiler versions in
your hardhat config.

* contracts/Foo2.sol

These files import other files that use a different and incompatible version of Solidity:

* contracts/Foo3.sol

These files and its dependencies cannot be compiled with your config:

* contracts/Foo4.sol

Learn more about compiler configuration at https://usehardhat.com/configuration
`
      );
    });
  });
});
