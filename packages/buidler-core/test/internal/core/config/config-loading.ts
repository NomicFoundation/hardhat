import { assert } from "chai";
import * as path from "path";

import { TASK_CLEAN } from "../../../../src/builtin-tasks/task-names";
import { BuidlerContext } from "../../../../src/internal/context";
import { loadConfigAndTasks } from "../../../../src/internal/core/config/config-loading";
import { ERRORS } from "../../../../src/internal/core/errors";
import { resetBuidlerContext } from "../../../../src/internal/reset";
import { useEnvironment } from "../../../helpers/environment";
import { expectBuidlerError } from "../../../helpers/errors";
import {
  getFixtureProjectPath,
  useFixtureProject
} from "../../../helpers/project";

describe("config loading", function() {
  describe("default config path", function() {
    useFixtureProject("config-project");
    useEnvironment();

    it("should load the default config if none is given", function() {
      assert.isDefined(this.env.config.networks.develop);
      assert.deepEqual(this.env.config.networks.develop.accounts, [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166"
      ]);
    });
  });

  describe("Config valudation", function() {
    describe("When the config is invalid", function() {
      useFixtureProject("invalid-config");

      beforeEach(function() {
        BuidlerContext.createBuidlerContext();
      });

      afterEach(function() {
        resetBuidlerContext();
      });

      it("Should throw the right error", function() {
        expectBuidlerError(
          () => loadConfigAndTasks(),
          ERRORS.GENERAL.INVALID_CONFIG
        );
      });
    });
  });

  describe("custom config path", function() {
    useFixtureProject("custom-config-file");

    beforeEach(function() {
      BuidlerContext.createBuidlerContext();
    });

    afterEach(function() {
      resetBuidlerContext();
    });

    it("should accept a relative path from the CWD", function() {
      const config = loadConfigAndTasks("config.js");

      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });

    it("should accept an absolute path", async function() {
      const fixtureDir = await getFixtureProjectPath("custom-config-file");
      const config = loadConfigAndTasks(fixtureDir + "/config.js");

      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });
  });

  describe("Tasks loading", function() {
    useFixtureProject("config-project");
    useEnvironment();

    it("Should define the default tasks", function() {
      assert.containsAllKeys(this.env.tasks, [
        TASK_CLEAN,
        "flatten",
        "compile",
        "help",
        "run",
        "test"
      ]);
    });

    it("Should load custom tasks", function() {
      assert.containsAllKeys(this.env.tasks, ["example", "example2"]);
    });
  });

  describe("Config env", function() {
    useFixtureProject("config-project");

    afterEach(function() {
      resetBuidlerContext();
    });

    it("should remove everything from global state after loading", function() {
      const globalAsAny: any = global;

      BuidlerContext.createBuidlerContext();
      loadConfigAndTasks();

      assert.isUndefined(globalAsAny.internalTask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);
      assert.isUndefined(globalAsAny.usePlugin);

      resetBuidlerContext();

      BuidlerContext.createBuidlerContext();
      loadConfigAndTasks();

      assert.isUndefined(globalAsAny.internalTask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);
      assert.isUndefined(globalAsAny.usePlugin);
      resetBuidlerContext();
    });
  });
});
