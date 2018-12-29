import { assert } from "chai";
import * as path from "path";

import { getConfig } from "../../../src/core/config/config-loading";
import {
  getFixtureProjectPath,
  useFixtureProject
} from "../../helpers/project";

describe("config loading", () => {
  describe("default config path", () => {
    useFixtureProject("config-project");
    it("should load the default config if none is given", () => {
      const [config, _] = getConfig();

      assert.isDefined(config.networks.develop);
      assert.deepEqual(config.networks.develop.accounts, [
        "0xa95f9e3e7ae4e4865c5968828fe7c03fffa8a9f3bb52d36d26243f4c868ee166"
      ]);
    });
  });

  describe("custom config path", () => {
    useFixtureProject("custom-config-file");

    it("should accept a relative path from the CWD", () => {
      const [config, _] = getConfig("config.js");
      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });

    it("should accept an absolute path", async () => {
      const fixtureDir = await getFixtureProjectPath("custom-config-file");
      const [config, _] = getConfig(fixtureDir + "/config.js");
      assert.equal(
        config.paths.configFile,
        path.normalize(path.join(process.cwd(), "config.js"))
      );
    });
  });

  describe("Tasks loading", () => {
    useFixtureProject("config-project");

    it("Should define the default tasks", () => {
      const [_, tasks] = getConfig();
      assert.containsAllKeys(tasks, [
        "clean",
        "flatten",
        "compile",
        "help",
        "run",
        "test"
      ]);
    });

    it("Should load custom tasks", () => {
      const [_, tasks] = getConfig();
      assert.containsAllKeys(tasks, ["example", "example2"]);
    });
  });

  describe("Config env", () => {
    useFixtureProject("config-project");
    it("should remove everything from global state after loading", () => {
      const globalAsAny: any = global;

      assert.isUndefined(globalAsAny.internalTask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.usePlugin);
      assert.isUndefined(globalAsAny.extendEnvironment);

      const [_, __] = getConfig();

      assert.isUndefined(globalAsAny.internalTask);
      assert.isUndefined(globalAsAny.task);
      assert.isUndefined(globalAsAny.types);
      assert.isUndefined(globalAsAny.usePlugin);
      assert.isUndefined(globalAsAny.extendEnvironment);
    });
  });
});
