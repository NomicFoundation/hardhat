import { assert } from "chai";
import path from "path";

import { TASK_CLEAN } from "../../../../src/builtin-tasks/task-names";
import { HardhatContext } from "../../../../src/internal/context";
import { loadConfigAndTasks } from "../../../../src/internal/core/config/config-loading";
import { ERRORS } from "../../../../src/internal/core/errors-list";
import { resetHardhatContext } from "../../../../src/internal/reset";
import { useEnvironment } from "../../../helpers/environment";
import {
  expectHardhatError,
  expectHardhatErrorAsync,
} from "../../../helpers/errors";
import {
  getFixtureProjectPath,
  useFixtureProject,
} from "../../../helpers/project";

describe("config loading", function () {
  describe("default config path", function () {
    useFixtureProject("config-project");
    useEnvironment();

    it("should load the default config if none is given", function () {
      assert.isDefined(this.env.config.networks.localhost);
      assert.deepEqual(this.env.config.networks.localhost.accounts, [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166",
      ]);
    });
  });

  describe("Config validation", function () {
    describe("When the config is invalid", function () {
      useFixtureProject("invalid-config");

      beforeEach(function () {
        HardhatContext.createHardhatContext();
      });

      afterEach(function () {
        resetHardhatContext();
      });

      it("Should throw the right error", function () {
        expectHardhatError(
          () => loadConfigAndTasks(),
          ERRORS.GENERAL.INVALID_CONFIG
        );
      });
    });
  });

  describe("custom config path", function () {
    useFixtureProject("custom-config-file");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should accept a relative path from the CWD", function () {
      const config = loadConfigAndTasks({ config: "config.js" });

      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });

    it("should accept an absolute path", async function () {
      const fixtureDir = await getFixtureProjectPath("custom-config-file");
      const config = loadConfigAndTasks({
        config: path.join(fixtureDir, "config.js"),
      });

      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });
  });

  describe("Tasks loading", function () {
    useFixtureProject("config-project");
    useEnvironment();

    it("Should define the default tasks", function () {
      assert.containsAllKeys(this.env.tasks, [
        TASK_CLEAN,
        "flatten",
        "compile",
        "help",
        "run",
        "test",
      ]);
    });

    it("Should load custom tasks", function () {
      assert.containsAllKeys(this.env.tasks, ["example", "example2"]);
    });
  });

  describe("Config env", function () {
    useFixtureProject("config-project");

    afterEach(function () {
      resetHardhatContext();
    });

    it("should remove everything from global state after loading", function () {
      const globalAsAny: any = global;

      HardhatContext.createHardhatContext();
      loadConfigAndTasks();

      assert.isUndefined(globalAsAny.subtask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);
      assert.isUndefined(globalAsAny.usePlugin);

      resetHardhatContext();

      HardhatContext.createHardhatContext();
      loadConfigAndTasks();

      assert.isUndefined(globalAsAny.subtask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);
      assert.isUndefined(globalAsAny.usePlugin);
      resetHardhatContext();
    });
  });

  describe("Config that imports the library", function () {
    useFixtureProject("config-imports-lib-project");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should accept a relative path from the CWD", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.GENERAL.LIB_IMPORTED_FROM_THE_CONFIG
      );
    });
  });

  describe("missing package", function () {
    useFixtureProject("import-missing-package");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should re-throw the error", function () {
      let errorThrown;
      try {
        loadConfigAndTasks();
      } catch (e) {
        errorThrown = e;
      }

      if (errorThrown === undefined) {
        assert.fail("No error was thrown");
      }

      assert(errorThrown.code === "MODULE_NOT_FOUND");
    });
  });

  describe("dependency not installed", function () {
    useFixtureProject("import-dependency-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should re-throw the error", function () {
      let errorThrown;
      try {
        loadConfigAndTasks();
      } catch (e) {
        errorThrown = e;
      }

      if (errorThrown === undefined) {
        assert.fail("No error was thrown");
      }

      assert(errorThrown.code === "MODULE_NOT_FOUND");
    });
  });

  describe("devDependency not installed", function () {
    useFixtureProject("import-dev-dependency-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should re-throw the error", function () {
      let errorThrown;
      try {
        loadConfigAndTasks();
      } catch (e) {
        errorThrown = e;
      }

      if (errorThrown === undefined) {
        assert.fail("No error was thrown");
      }

      assert(errorThrown.code === "MODULE_NOT_FOUND");
    });
  });

  describe("plugin peer dependency not installed", function () {
    useFixtureProject("plugin-peer-dependency-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should indicate the plugin and the missing dependency", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.PLUGINS.MISSING_DEPENDENCIES,
        "Plugin some-plugin requires the following dependencies to be installed: some-dependency"
      );
    });
  });

  describe("plugin multiple peer dependencies not installed", function () {
    useFixtureProject("plugin-multiple-peer-dependencies-not-installed");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should indicate the plugin and the missing dependencies", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.PLUGINS.MISSING_DEPENDENCIES,
        "Plugin some-plugin requires the following dependencies to be installed: some-dependency, some-other-dependency"
      );
    });
  });

  describe("buidler plugin", function () {
    useFixtureProject("buidler-plugin");

    beforeEach(function () {
      HardhatContext.createHardhatContext();
    });

    afterEach(function () {
      resetHardhatContext();
    });

    it("should indicate the buidler plugin", function () {
      expectHardhatError(
        () => loadConfigAndTasks(),
        ERRORS.PLUGINS.BUIDLER_PLUGIN,
        `You are using some-buidler-plugin, which is a Buidler plugin. Use the equivalent
Hardhat plugin instead.`
      );
    });
  });

  describe("dynamic import of missing dependency in task", function () {
    useFixtureProject("plugin-dynamic-import-not-installed");
    useEnvironment();

    it("should indicate the plugin and the missing dependencies", async function () {
      await expectHardhatErrorAsync(
        () => this.env.run("some-task"),
        ERRORS.PLUGINS.MISSING_DEPENDENCIES,
        "Plugin some-plugin requires the following dependencies to be installed: some-dependency"
      );
    });
  });
});
