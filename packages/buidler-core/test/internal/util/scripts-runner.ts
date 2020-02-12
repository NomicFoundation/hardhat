import { assert } from "chai";
import os from "os";
import path from "path";

import {
  runScript,
  runScriptWithBuidler
} from "../../../src/internal/util/scripts-runner";
import { useEnvironment } from "../../helpers/environment";
import { useFixtureProject } from "../../helpers/project";

describe("Scripts runner", function() {
  useFixtureProject("project-with-scripts");

  it("Should pass params to the script", async function() {
    const statusCode = await runScript("./params-script.js", ["a", "b", "c"]);
    assert.equal(statusCode, 0);

    // We check here that the script is correctly testing this:
    const statusCode2 = await runScript("./params-script.js");
    assert.notEqual(statusCode2, 0);
  });

  it("Should run the script to completion", async function() {
    const before = new Date();
    await runScript("./async-script.js");
    const after = new Date();

    assert.isAtLeast(after.getTime() - before.getTime(), 100);
  });

  it("Should resolve to the status code of the script run", async function() {
    this.timeout(35000);

    if (os.type() === "Windows_NT") {
      this.skip();
    }

    const statusCode1 = await runScript(
      "./async-script.js",
      [],
      ["--require", path.join(__dirname, "..", "..", "..", "src", "register")]
    );
    assert.equal(statusCode1, 0);

    const statusCode2 = await runScript("./failing-script.js");
    assert.equal(statusCode2, 123);

    const statusCode3 = await runScript(
      "./successful-script.js",
      [],
      ["--require", path.join(__dirname, "..", "..", "..", "src", "register")]
    );
    assert.equal(statusCode3, 0);
  });

  it("Should pass env variables to the script", async function() {
    const statusCode = await runScript("./env-var-script.js", [], [], {
      TEST_ENV_VAR: "test"
    });
    assert.equal(statusCode, 0);

    // We check here that the script is correctly testing this:
    const statusCode2 = await runScript("./env-var-script.js");
    assert.notEqual(statusCode2, 0);
  });

  describe("runWithBuidler", function() {
    useEnvironment();

    it("Should load buidler/register successfully", async function() {
      const statusCode = await runScriptWithBuidler(
        this.env.buidlerArguments,
        "./successful-script.js"
      );
      assert.equal(statusCode, 0);

      // We check here that the script is correctly testing this:
      const statusCode2 = await runScript("./successful-script.js");
      assert.notEqual(statusCode2, 0);
    });

    it("Should forward all the buidler arguments", async function() {
      // This is only for testing purposes, as we can't set a buidler argument
      // as the CLA does, and env variables always get forwarded to child
      // processes
      this.env.buidlerArguments.network = "custom";

      const statusCode = await runScriptWithBuidler(
        this.env.buidlerArguments,
        "./assert-buidler-arguments.js"
      );

      assert.equal(statusCode, 0);
    });
  });
});
