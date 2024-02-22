import { assert } from "chai";

import {
  runScript,
  runScriptWithHardhat,
} from "../../../src/internal/util/scripts-runner";
import { useEnvironment } from "../../helpers/environment";
import { useFixtureProject } from "../../helpers/project";

describe("Scripts runner (CJS)", function () {
  useFixtureProject("project-with-scripts");

  it("Should pass params to the script", async function () {
    const [statusCodeWithScriptParams, statusCodeWithNoParams] =
      await Promise.all([
        runScript("./params-script.js", ["a", "b", "c"]),
        runScript("./params-script.js"),
      ]);

    assert.strictEqual(statusCodeWithScriptParams, 0);

    // We check here that the script is correctly testing this:
    assert.notEqual(statusCodeWithNoParams, 0);
  });

  it("Should run the script to completion", async function () {
    const before = new Date();
    const status = await runScript("./async-script.js");
    assert.strictEqual(status, 123);
    const after = new Date();

    assert.isAtLeast(after.getTime() - before.getTime(), 100);
  });

  it("Should resolve to the status code of the script run", async function () {
    assert.deepEqual(await runScript("./failing-script.js"), 123);
  });

  it("Should pass env variables to the script", async function () {
    const [statusCodeWithEnvVars, statusCodeWithNoEnvArgs] = await Promise.all([
      runScript("./env-var-script.js", [], [], {
        TEST_ENV_VAR: "test",
      }),
      runScript("./env-var-script.js"),
    ]);

    assert.strictEqual(
      statusCodeWithEnvVars,
      0,
      "Status code with env vars should be 0"
    );

    assert.notEqual(
      statusCodeWithNoEnvArgs,
      0,
      "Status code with no env vars should not be 0"
    );
  });

  describe("runWithHardhat", function () {
    useEnvironment();

    it("Should load hardhat/register successfully", async function () {
      const [statusCodeWithHardhat, statusCodeWithoutHardhat] =
        await Promise.all([
          runScriptWithHardhat(
            this.env.hardhatArguments,
            "./successful-script.js"
          ),
          runScript("./successful-script.js"),
        ]);

      assert.strictEqual(statusCodeWithHardhat, 0);

      // We check here that the script is correctly testing this:
      assert.notEqual(statusCodeWithoutHardhat, 0);
    });

    it("Should forward all the hardhat arguments", async function () {
      // This is only for testing purposes, as we can't set a hardhat argument
      // as the CLA does, and env variables always get forwarded to child
      // processes
      this.env.hardhatArguments.network = "custom";

      const statusCode = await runScriptWithHardhat(
        this.env.hardhatArguments,
        "./assert-hardhat-arguments.js"
      );

      assert.strictEqual(statusCode, 0);
    });
  });
});

describe("Scripts runner (ESM)", function () {
  useFixtureProject("esm-project-with-scripts");

  it("Should pass params to the script", async function () {
    const [statusCodeWithScriptParams, statusCodeWithNoParams] =
      await Promise.all([
        runScript("./params-script.js", ["a", "b", "c"]),
        runScript("./params-script.js"),
      ]);

    assert.strictEqual(statusCodeWithScriptParams, 0);

    // We check here that the script is correctly testing this:
    assert.notEqual(statusCodeWithNoParams, 0);
  });

  it("Should run the script to completion", async function () {
    const before = new Date();
    const status = await runScript("./async-script.js");
    assert.strictEqual(status, 123);
    const after = new Date();

    assert.isAtLeast(after.getTime() - before.getTime(), 100);
  });

  it("Should resolve to the status code of the script run", async function () {
    assert.deepEqual(await runScript("./failing-script.js"), 123);
  });

  it("Should pass env variables to the script", async function () {
    const [statusCodeWithEnvVars, statusCodeWithNoEnvArgs] = await Promise.all([
      runScript("./env-var-script.js", [], [], {
        TEST_ENV_VAR: "test",
      }),
      runScript("./env-var-script.js"),
    ]);

    assert.strictEqual(
      statusCodeWithEnvVars,
      0,
      "Status code with env vars should be 0"
    );

    assert.notEqual(
      statusCodeWithNoEnvArgs,
      0,
      "Status code with no env vars should not be 0"
    );
  });

  describe("runWithHardhat", function () {
    useEnvironment();

    it("Should load hardhat/register successfully", async function () {
      const [statusCodeWithHardhat, statusCodeWithoutHardhat] =
        await Promise.all([
          runScriptWithHardhat(
            this.env.hardhatArguments,
            "./successful-script.js"
          ),
          runScript("./successful-script.js"),
        ]);

      assert.strictEqual(statusCodeWithHardhat, 0);

      // We check here that the script is correctly testing this:
      assert.notEqual(statusCodeWithoutHardhat, 0);
    });

    it("Should forward all the hardhat arguments", async function () {
      // This is only for testing purposes, as we can't set a hardhat argument
      // as the CLA does, and env variables always get forwarded to child
      // processes
      this.env.hardhatArguments.network = "custom";

      const statusCode = await runScriptWithHardhat(
        this.env.hardhatArguments,
        "./assert-hardhat-arguments.js"
      );

      assert.strictEqual(statusCode, 0);
    });
  });
});
