import { assert } from "chai";
import * as path from "path";

import { TASK_CLEAN } from "../../../../src/builtin-tasks/task-names";
import { BuidlerContext } from "../../../../src/internal/context";
import { loadConfigAndTasks } from "../../../../src/internal/core/config/config-loading";
import { resetBuidlerContext, unloadModule } from "../../../helpers/context";
import {
  getFixtureProjectPath,
  useFixtureProject
} from "../../../helpers/project";

describe("config loading", () => {
  afterEach(async () => {
    await resetBuidlerContext();
  });
  describe("default config path", () => {
    useFixtureProject("config-project");
    it("should load the default config if none is given", () => {
      const config = loadConfigAndTasks();

      assert.isDefined(config.networks.develop);
      assert.deepEqual(config.networks.develop.accounts, [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166"
      ]);
    });
  });

  describe("custom config path", () => {
    useFixtureProject("custom-config-file");

    it("should accept a relative path from the CWD", () => {
      const config = loadConfigAndTasks("config.js");
      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });

    it("should accept an absolute path", async () => {
      const fixtureDir = await getFixtureProjectPath("custom-config-file");
      const config = loadConfigAndTasks(fixtureDir + "/config.js");
      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
      unloadModule(config.paths.configFile);
    });
  });

  describe("Tasks loading", () => {
    useFixtureProject("config-project");

    it("Should define the default tasks", () => {
      const _ = loadConfigAndTasks();
      const tasks = BuidlerContext.getBuidlerContext().tasksDSL.getTaskDefinitions();

      assert.containsAllKeys(tasks, [
        TASK_CLEAN,
        "flatten",
        "compile",
        "help",
        "run",
        "test"
      ]);
      unloadModule(_.paths.configFile);
    });

    it("Should load custom tasks", () => {
      const config = loadConfigAndTasks();
      const tasks = BuidlerContext.getBuidlerContext().tasksDSL.getTaskDefinitions();

      assert.containsAllKeys(tasks, ["example", "example2"]);
      unloadModule(config.paths.configFile);
    });
  });

  describe("Config env", () => {
    useFixtureProject("config-project");
    it("should remove everything from global state after loading", () => {
      const globalAsAny: any = global;

      assert.isUndefined(globalAsAny.internalTask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);

      const _ = loadConfigAndTasks();

      assert.isUndefined(globalAsAny.internalTask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.extendEnvironment);
    });
  });
});
