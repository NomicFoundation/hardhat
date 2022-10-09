import os from "os";

import { assert } from "chai";
import fsExtra from "fs-extra";
import path from "path";
import shell from "shelljs";

import { useFixture } from "./helpers";

const hardhatBinary = path.join("node_modules", ".bin", "hardhat");

const versionRegExp = /^\d+\.\d+\.\d+\n$/;

describe("e2e tests", function () {
  before(function () {
    shell.set("-e"); // Ensure that shell failures will induce test failures
  });

  describe("basic-project", function () {
    useFixture("basic-project");

    it("should print the hardhat version", function () {
      const { code, stdout } = shell.exec(`${hardhatBinary} --version`);
      assert.equal(code, 0);
      assert.match(stdout, versionRegExp);
    });

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
      assert.match(stdout, /Compiled \d+ Solidity files? successfully/);

      // hh clean
      const { code: hhCleanCode2 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode2, 0);
    });

    it("should test programmatically", function () {
      // hh clean
      const { code: hhCleanCode1 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode1, 0);

      // hh compile
      const { code: testRunCode, stdout } = shell.exec(
        `${hardhatBinary} run ./scripts/multi-run-test.js`
      );
      assert.equal(testRunCode, 0);

      // check stdout

      // check we get passing runs
      assert.match(stdout, /2 passing/);
      // check we get no runs without tests
      assert.notMatch(
        stdout,
        /0 passing/,
        "A test run occured with 0 tests - potential caching issue"
      );

      // hh clean
      const { code: hhCleanCode2 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode2, 0);
    });

    it("the test task should accept test files", async function () {
      // hh clean
      const { code: hhCleanCode1 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode1, 0);

      // hh test without ./
      const { code: testRunCode1 } = shell.exec(
        `${hardhatBinary} test test/simple.js`
      );
      assert.equal(testRunCode1, 0);

      // hh test with ./
      const { code: testRunCode2 } = shell.exec(
        `${hardhatBinary} test ./test/simple.js`
      );
      assert.equal(testRunCode2, 0);
    });

    it("should run tests in parallel", function () {
      // hh clean
      const { code: hhCleanCode1 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode1, 0);

      // hh test --parallel
      const { code: hhCompileCode, stdout } = shell.exec(
        `${hardhatBinary} test --parallel`
      );
      assert.equal(hhCompileCode, 0);

      // check we get passing runs
      assert.match(stdout, /2 passing/);

      // hh clean
      const { code: hhCleanCode2 } = shell.exec(`${hardhatBinary} clean`);
      assert.equal(hhCleanCode2, 0);
    });
  });

  describe("sample projects", function () {
    // These tests generate the sample project and then exercise the commands
    // that are suggested to the user after project generation.  It would be
    // better if that list of commands were externalized somewhere, in a place
    // from which we could consume them here, so that the lists of commands
    // executed here cannot fall out of sync with what's actually suggested to
    // the user, but this approach was more expedient.

    before(function () {
      if (os.type() === "Windows_NT") {
        // See https://github.com/nomiclabs/hardhat/issues/1698
        this.skip();
      }
    });

    describe("javascript sample project", function () {
      useFixture("javascript-sample-project");

      before(function () {
        shell.exec(`${hardhatBinary}`, {
          env: {
            ...process.env,
            HARDHAT_CREATE_JAVASCRIPT_PROJECT_WITH_DEFAULTS: "true",
          },
        });
      });

      for (const suggestedCommand of [
        // This list should be kept reasonably in sync with
        // packages/hardhat-core/sample-projects/javascript/README.md
        `${hardhatBinary} help`,
        `${hardhatBinary} test`,
        `${hardhatBinary} run scripts/deploy.js`,
      ]) {
        it(`should permit successful execution of the suggested command "${suggestedCommand}"`, async function () {
          shell.exec(suggestedCommand, {
            env: {
              ...process.env,
            },
          });
        });
      }

      it("should report gas", async function () {
        const { stdout } = shell.exec(`${hardhatBinary} test`, {
          env: {
            ...process.env,
            REPORT_GAS: "true",
          },
        });

        // check that some row has the gas report headers
        // this will break if hardhat-gas-reporter changes its output
        const lines = stdout.split(os.EOL);
        const hasGasReport = lines.some((x) =>
          x.match(/Contract.*Method.*Min.*Max.*Avg/)
        );

        assert.isTrue(hasGasReport);
      });
    });

    describe("typescript sample project", function () {
      useFixture("typescript-sample-project");

      before(function () {
        shell.exec(`${hardhatBinary}`, {
          env: {
            ...process.env,
            HARDHAT_CREATE_TYPESCRIPT_PROJECT_WITH_DEFAULTS: "true",
          },
        });
      });

      for (const suggestedCommand of [
        // This list should be kept reasonably in sync with
        // packages/hardhat-core/sample-projects/typescript/README.md
        `${hardhatBinary} help`,
        `${hardhatBinary} test`,
        `${hardhatBinary} run scripts/deploy.ts`,
      ]) {
        it(`should permit successful execution of the suggested command "${suggestedCommand}"`, async function () {
          shell.exec(suggestedCommand, {
            env: {
              ...process.env,
            },
          });
        });
      }

      it("should report gas", async function () {
        const { stdout } = shell.exec(`${hardhatBinary} test`, {
          env: {
            ...process.env,
            REPORT_GAS: "true",
          },
        });

        const lines = stdout.split(os.EOL);
        const hasGasReport = lines.some((x) =>
          x.match(/Contract.*Method.*Min.*Max.*Avg/)
        );

        assert.isTrue(hasGasReport);
      });
    });
  });

  describe("no project", function () {
    useFixture("empty");

    it("should print the hardhat version", function () {
      const { code, stdout } = shell.exec(`${hardhatBinary} --version`);
      assert.equal(code, 0);
      assert.match(stdout, versionRegExp);
    });

    it(`should print an error message if you try to compile`, function () {
      shell.set("+e");
      const { code, stderr } = shell.exec(`${hardhatBinary} compile`);
      shell.set("-e");
      assert.equal(code, 1);
      // This is a loose match to check HH1 and HH15
      assert.match(stderr, /You are not inside/);
      assert.match(stderr, /HH15?/);
    });
  });

  describe("--typecheck", function () {
    // we don't want to throw for failed executions in these tests
    before(() => shell.set("+e"));
    after(() => shell.set("-e"));

    describe("javascript project", function () {
      useFixture("basic-project");

      it("should throw if --typecheck is used", async function () {
        const { code, stderr } = shell.exec(`${hardhatBinary} --typecheck`);

        assert.equal(code, 1);
        assert.include(stderr, "Error HH313");
      });
    });

    describe("type error in config", function () {
      useFixture("type-error-in-config");

      it("should not throw by default", async function () {
        const { code } = shell.exec(`${hardhatBinary}`);

        assert.equal(code, 0);
      });

      it("should throw if --typecheck is used", async function () {
        const { code, stderr } = shell.exec(`${hardhatBinary} --typecheck`);

        assert.equal(code, 1);
        assert.include(stderr, "error TS");
      });
    });

    describe("type error in script", function () {
      useFixture("type-error-in-script");

      it("should not throw by default", async function () {
        const { code } = shell.exec(`${hardhatBinary} run script.ts`);

        assert.equal(code, 0);
      });

      it("should throw if --typecheck is used", async function () {
        const { code, stderr } = shell.exec(
          `${hardhatBinary} run script.ts --typecheck`
        );

        assert.equal(code, 1);
        assert.include(stderr, "error TS");
      });
    });

    describe("type error in test", function () {
      useFixture("type-error-in-test");

      it("should not throw by default", async function () {
        const { code } = shell.exec(`${hardhatBinary} test`);

        assert.equal(code, 0);
      });

      it("should throw if --typecheck is used", async function () {
        const { code, stderr } = shell.exec(
          `${hardhatBinary} test --typecheck`
        );

        assert.equal(code, 1);
        assert.include(stderr, "error TS");
      });
    });
  });
});
