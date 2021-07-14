import child_process from "child_process";

import { assert } from "chai";

import { getPackageRoot } from "../../../src/internal/util/packageInfo";

import { useTmpDir } from "../../helpers/fs";

describe("command-line interface", function () {
  // The commands exercised in the tests, after project generation, were
  // manually copied from the README.txt that's included in the sample project.
  // Perhaps it would be better if we *generated* that README, and had all of
  // the sample commands listed in their own file, so that we can simply read
  // the commands from that file and execute them here, so that we'll be
  // actually verifying the commands were suggesting, without any risk of the
  // README falling out of sync with what's tested here.

  // It would be better if we had separate, independent tests for each of the
  // suggested commands, but because the project creation takes so long
  // (really it's the dependency installation that's so time consuming) even
  // a single test already has a crazy long run time, so for expediency this
  // is one big complex test.
  this.timeout(120 * 1000);

  useTmpDir("cli");
  beforeEach(function () {
    this.originalCwd = process.cwd();
    process.chdir(this.tmpDir);
  });
  afterEach(function () {
    process.chdir(this.originalCwd);
  });

  describe("sample project", function () {
    it("should permit successful execution all of the suggested commands", async function () {
      try {
        child_process.execSync("yarn init --yes");
        child_process.execSync(`yarn add --dev file:${getPackageRoot()}`);
        child_process.execSync("npx hardhat", {
          env: {
            ...process.env,
            HARDHAT_CREATE_SAMPLE_PROJECT_WITH_DEFAULTS: "true",
          },
        });
        child_process.execSync("npx hardhat accounts");
        child_process.execSync("npx hardhat compile");
        child_process.execSync("npx hardhat test");
        child_process.execSync("node scripts/sample-script.js");
      } catch (error) {
        assert.fail(
          `error status ${error.status}, message: "${error.message}", stderr: "${error.stderr}", stdout: "${error.stdout}"`
        );
      }
    });
  });
});
