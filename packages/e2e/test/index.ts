import os from "os";

import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";
import shell from "shelljs";

import { useFixture } from "./helpers";

const hardhatBinary = path.join("node_modules", ".bin", "hardhat");

describe("e2e tests", function () {
  describe("basic-project", function () {
    useFixture("basic-project");

    it("should compile", function () {
      // hh clean
      const { code: hhCleanCode1 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode1, 0);

      // hh compile
      const { code: hhCompileCode, stdout } = shell.exec(
        `${hardhatBinary} compile`
      );
      assert.equal(hhCompileCode, 0);

      // check artifacts were created
      const artifactsDir = path.join(this.testDirPath, "artifacts");
      assert.isTrue(fsExtra.existsSync(artifactsDir));

      // check stdout
      assert.match(stdout, /Compilation finished successfully/);

      // hh clean
      const { code: hhCleanCode2 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode2, 0);
    });
  });

  describe("sample project", function () {
    // These tests generate the sample project and then exercise the commands
    // that are suggested to the user after project generation.  It would be
    // better if that list of commands were exernalized somewhere, in a place
    // from which we could consume them here, so that the list of commands
    // executed here cannot fall out of sync with what's actually suggested to
    // the user, but this approach was more expedient.

    // Also, it would be better if we had separate, independent tests for each
    // of the individual suggested commands, but because the project creation
    // takes so long (really it's the dependency installation that's so time
    // consuming) even a single test already has a crazy long run time, so for
    // expediency this is one big complex test.

    useFixture("sample-project");

    it("should permit successful execution all of the suggested commands", async function () {
      if (os.type() === "Windows_NT") {
        // cf. https://github.com/nomiclabs/hardhat/issues/1698
        this.skip();
      }
      try {
        shell.exec(`${hardhatBinary}`, {
          env: {
            ...process.env,
            HARDHAT_CREATE_SAMPLE_PROJECT_WITH_DEFAULTS: "true",
          },
        });
        shell.exec(`${hardhatBinary} accounts`);
        shell.exec(`${hardhatBinary} compile`);
        shell.exec(`${hardhatBinary} test`);
        shell.exec("node scripts/sample-script.js");
      } catch (error) {
        assert.fail(
          `error status ${error.status}, message: "${error.message}", stderr: "${error.stderr}", stdout: "${error.stdout}"`
        );
      }
    });
  });
});
