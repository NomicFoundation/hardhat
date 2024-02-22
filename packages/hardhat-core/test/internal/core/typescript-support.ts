import { assert } from "chai";

import { TASK_TEST_GET_TEST_FILES } from "../../../src/builtin-tasks/task-names";
import { resetHardhatContext } from "../../../src/internal/reset";
import { useEnvironment } from "../../helpers/environment";
import { useFixtureProject } from "../../helpers/project";
import { expectHardhatError } from "../../helpers/errors";
import { ERRORS } from "../../../src/internal/core/errors-list";
import { getRealPath } from "../../../src/internal/util/fs-utils";

describe("Typescript support", function () {
  describe("strict typescript config", function () {
    useFixtureProject("broken-typescript-config-project");
    it("Should fail if an implicit any is used and the tsconfig forbids them", function () {
      // If we run this test in transpilation only mode, it will fail
      this.skip();

      assert.throws(
        () => require("../../../src/internal/lib/hardhat-lib"),
        "TS7006"
      );

      resetHardhatContext();
    });
  });

  describe("hardhat.config.ts", function () {
    useFixtureProject("typescript-project");
    useEnvironment();

    it("Should load the config", function () {
      assert.isDefined(this.env.config.networks.network);
    });
  });

  describe("Typescript scripts", function () {
    useFixtureProject("typescript-project");
    useEnvironment();

    it("Should run ts scripts", async function () {
      await this.env.run("run", { script: "./script.ts", noCompile: true });
      assert.strictEqual(process.exitCode, 123);
      (process as any).exitCode = undefined;
    });
  });

  describe("Typescript tests", function () {
    useFixtureProject("typescript-project");
    useEnvironment();

    it("Should see the TS test", async function () {
      const tests: string[] = await this.env.run(TASK_TEST_GET_TEST_FILES, {
        testFiles: [],
      });

      assert.deepEqual(tests.sort(), [
        await getRealPath("test/js-test.js"),
        await getRealPath("test/ts-test.ts"),
      ]);
    });
  });
});

describe("tsconfig param", function () {
  useFixtureProject("typescript-project");
  describe("When setting an incorrect tsconfig file", function () {
    beforeEach(() => {
      process.env.HARDHAT_TSCONFIG = "non-existent.ts";
    });

    afterEach(() => {
      delete process.env.HARDHAT_TSCONFIG;
      resetHardhatContext();
    });

    it("should fail to load hardhat", function () {
      expectHardhatError(
        () => require("../../../src/internal/lib/hardhat-lib"),
        ERRORS.ARGUMENTS.INVALID_ENV_VAR_VALUE
      );
    });
  });

  describe("When setting a correct tsconfig file", function () {
    beforeEach(() => {
      process.env.HARDHAT_TSCONFIG = "./test/tsconfig.json";
    });

    afterEach(() => {
      delete process.env.HARDHAT_TSCONFIG;
      resetHardhatContext();
    });

    it("should load hardhat", function () {
      assert.doesNotThrow(() =>
        require("../../../src/internal/lib/hardhat-lib")
      );
    });
  });
});
