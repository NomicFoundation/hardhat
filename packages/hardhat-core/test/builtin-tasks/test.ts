import { assert } from "chai";

import { useFixtureProject } from "../helpers/project";
import { useEnvironment } from "../helpers/environment";

describe("test task", function () {
  describe("default config project", function () {
    useFixtureProject("test-task/minimal-config");
    useEnvironment();

    it("should run tests", async function () {
      await this.env.run("test", {
        noCompile: true,
      });

      assert.equal(process.exitCode, 0);
      (process as any).exitCode = undefined;
    });
  });

  describe("failing tests", function () {
    useFixtureProject("test-task/failing-tests");
    useEnvironment();

    it("should have a return code equal to the number of failing tests", async function () {
      await this.env.run("test", {
        noCompile: true,
      });

      assert.equal(process.exitCode, 2);
      (process as any).exitCode = undefined;
    });
  });

  describe("parallel tests", function () {
    useFixtureProject("test-task/parallel-tests");

    describe("with the default config", function () {
      useEnvironment();

      it("should fail in serial mode", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });

      it("should pass in parallel mode", async function () {
        await this.env.run("test", {
          noCompile: true,
          parallel: true,
        });

        assert.equal(process.exitCode, 0);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has parallel: true", function () {
      useEnvironment("hardhat.config-parallel-true.js");

      it("use parallel by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 0);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has parallel: false", function () {
      useEnvironment("hardhat.config-parallel-false.js");

      it("use serial by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });

      it("should be overridable", async function () {
        await this.env.run("test", {
          noCompile: true,
          parallel: true,
        });

        assert.equal(process.exitCode, 0);
        (process as any).exitCode = undefined;
      });
    });
  });

  describe("bail", function () {
    useFixtureProject("test-task/bail");

    describe("with the default config", function () {
      useEnvironment();

      it("should have two failures if all tests are run", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 2);
        (process as any).exitCode = undefined;
      });

      it("should stop at the first failure if --bail is used", async function () {
        await this.env.run("test", {
          noCompile: true,
          bail: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has bail: true", function () {
      useEnvironment("hardhat.config-bail-true.js");

      it("use bail by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has bail: false", function () {
      useEnvironment("hardhat.config-bail-false.js");

      it("don't bail by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 2);
        (process as any).exitCode = undefined;
      });

      it("should be overridable", async function () {
        await this.env.run("test", {
          noCompile: true,
          bail: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });
  });
});
