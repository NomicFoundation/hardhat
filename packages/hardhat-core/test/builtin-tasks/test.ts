import { assert } from "chai";

import { ERRORS } from "../../src/internal/core/errors-list";
import { useFixtureProject } from "../helpers/project";
import { useEnvironment } from "../helpers/environment";
import { expectHardhatErrorAsync } from "../helpers/errors";

// This file and the associated fixture projects have a lot of duplication. The
// reason is that some fixture projects use Mocha in ESM mode, which doesn't
// support cleaning the cache.
//
// To work around that, this suite uses a different
// fixture project for each test. There shouldn't be two `useFixtureProject`
// calls with the same argument, and each `it` should have its own fixture
// project.

describe("test task (CJS)", function () {
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
    describe("with the default config in serial mode", function () {
      useFixtureProject("test-task/parallel-tests/serial");
      useEnvironment();

      it("should fail in serial mode", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("with the default config in parallel mode", function () {
      useFixtureProject("test-task/parallel-tests/parallel");
      useEnvironment();

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
      useFixtureProject("test-task/parallel-tests/parallel-config-true");
      useEnvironment();

      it("use parallel by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 0);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has parallel: false", function () {
      useFixtureProject("test-task/parallel-tests/parallel-config-false");
      useEnvironment();

      it("use serial by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has parallel: false and it's overridden", function () {
      useFixtureProject(
        "test-task/parallel-tests/parallel-config-false-overridden"
      );
      useEnvironment();

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
    describe("with the default config and no --bail", function () {
      useFixtureProject("test-task/bail/default");
      useEnvironment();

      it("should have two failures if all tests are run", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 2);
        (process as any).exitCode = undefined;
      });
    });

    describe("with the default config and no --bail", function () {
      useFixtureProject("test-task/bail/default-with-bail-flag");
      useEnvironment();

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
      useFixtureProject("test-task/bail/config-bail-true");
      useEnvironment();

      it("use bail by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has bail: false", function () {
      useFixtureProject("test-task/bail/config-bail-false");
      useEnvironment();

      it("don't bail by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 2);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has bail: false and it's overridden", function () {
      useFixtureProject("test-task/bail/config-bail-false-overridden");
      useEnvironment();

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

  describe("mixed files", function () {
    useFixtureProject("test-task/mixed-test-files");
    useEnvironment();

    it("should run .js, .cjs and .mjs files", async function () {
      await this.env.run("test", {
        noCompile: true,
      });

      // each file has a single failing test, so the exit code should be 3
      assert.equal(process.exitCode, 3);
      (process as any).exitCode = undefined;
    });
  });

  describe("running tests programmatically twice", function () {
    useFixtureProject("test-task/run-tests-twice");
    useEnvironment();

    it("should run tests twice without an error", async function () {
      const result = await this.env.run("twice");

      assert.isTrue(result);
    });
  });

  describe("running tests programmatically twice, one test is .mjs", function () {
    useFixtureProject("test-task/run-tests-twice-mjs");
    useEnvironment();

    it("should throw an error", async function () {
      await expectHardhatErrorAsync(async () => {
        await this.env.run("twice");
      }, ERRORS.BUILTIN_TASKS.TEST_TASK_ESM_TESTS_RUN_TWICE);
    });
  });
});

describe("test task (ESM)", function () {
  describe("default config project", function () {
    useFixtureProject("esm-test-task/minimal-config");
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
    useFixtureProject("esm-test-task/failing-tests");
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
    describe("with the default config in serial mode", function () {
      useFixtureProject("esm-test-task/parallel-tests/serial");
      useEnvironment();

      it("should fail in serial mode", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("with the default config in parallel mode", function () {
      useFixtureProject("esm-test-task/parallel-tests/parallel");
      useEnvironment();

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
      useFixtureProject("esm-test-task/parallel-tests/parallel-config-true");
      useEnvironment();

      it("use parallel by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 0);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has parallel: false", function () {
      useFixtureProject("esm-test-task/parallel-tests/parallel-config-false");
      useEnvironment();

      it("use serial by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has parallel: false and it's overridden", function () {
      useFixtureProject(
        "esm-test-task/parallel-tests/parallel-config-false-overridden"
      );
      useEnvironment();

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
    describe("with the default config", function () {
      useFixtureProject("esm-test-task/bail/default");
      useEnvironment();

      it("should have two failures if all tests are run", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 2);
        (process as any).exitCode = undefined;
      });
    });

    describe("with the default config", function () {
      useFixtureProject("esm-test-task/bail/with-bail-flag");
      useEnvironment();

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
      useFixtureProject("esm-test-task/bail/bail-config-true");
      useEnvironment();

      it("use bail by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 1);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has bail: false", function () {
      useFixtureProject("esm-test-task/bail/bail-config-false");
      useEnvironment();

      it("don't bail by default", async function () {
        await this.env.run("test", {
          noCompile: true,
        });

        assert.equal(process.exitCode, 2);
        (process as any).exitCode = undefined;
      });
    });

    describe("when the config has bail: false and it's overridden", function () {
      useFixtureProject("esm-test-task/bail/bail-config-false-overridden");
      useEnvironment();

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

  describe("mixed files", function () {
    useFixtureProject("esm-test-task/mixed-test-files");
    useEnvironment();

    it("should run .js, .cjs and .mjs files", async function () {
      await this.env.run("test", {
        noCompile: true,
      });

      // each file has a single failing test, so the exit code should be 3
      assert.equal(process.exitCode, 3);
      (process as any).exitCode = undefined;
    });
  });

  describe("running tests programmatically twice", function () {
    useFixtureProject("esm-test-task/run-tests-twice");
    useEnvironment();

    it("should throw an error", async function () {
      await expectHardhatErrorAsync(async () => {
        await this.env.run("twice");
      }, ERRORS.BUILTIN_TASKS.TEST_TASK_ESM_TESTS_RUN_TWICE);
    });
  });
});
