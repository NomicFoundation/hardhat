import { assert } from "chai";
import fsExtra from "fs-extra";
import slash from "slash";

import { TASK_TEST_GET_TEST_FILES } from "../../../src/builtin-tasks/task-names";
import { isTypescriptSupported } from "../../../src/internal/core/typescript-support";
import { resetBuidlerContext } from "../../../src/internal/reset";
import { useEnvironment } from "../../helpers/environment";
import { useFixtureProject } from "../../helpers/project";

describe("Typescript support", function() {
  describe("helpers", function() {
    assert.isTrue(isTypescriptSupported());
  });

  describe("strict typescript config", function() {
    useFixtureProject("broken-typescript-config-project");
    it("Should fail if an implicit any is used and the tsconfig forbids them", function() {
      // If we run this test in transpilation only mode, it will fail
      if (process.env.TS_NODE_TRANSPILE_ONLY === "true") {
        return;
      }

      assert.throws(
        () => require("../../../src/internal/lib/buidler-lib"),
        "TS7006"
      );

      resetBuidlerContext();
    });
  });

  describe("buidler.config.ts", function() {
    useFixtureProject("typescript-project");
    useEnvironment();

    it("Should load the config", function() {
      assert.isDefined(this.env.config.networks.network);
    });
  });

  describe("Typescript scripts", function() {
    useFixtureProject("typescript-project");
    useEnvironment();

    it("Should run ts scripts", async function() {
      await this.env.run("run", { script: "./script.ts", noCompile: true });
      assert.equal(process.exitCode, 123);
      (process as any).exitCode = undefined;
    });
  });

  describe("Typescript tests", function() {
    useFixtureProject("typescript-project");
    useEnvironment();

    it("Should see the TS test", async function() {
      const tests: string[] = await this.env.run(TASK_TEST_GET_TEST_FILES, {
        testFiles: []
      });

      assert.deepEqual(tests.sort(), [
        await fsExtra.realpath("test/js-test.js").then(slash),
        await fsExtra.realpath("test/ts-test.ts").then(slash)
      ]);
    });
  });
});
