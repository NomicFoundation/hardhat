import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { assert } from "chai";
import fsExtra from "fs-extra";

import { useEnvironment } from "./helpers";

describe("Autoexternal plugin", function() {
  useEnvironment(__dirname + "/buidler-project");

  afterEach("clear cache directory", async function() {
    await fsExtra.emptyDir(this.env.config.paths.cache);
  });

  describe("Plugin loaded", async function() {
    useEnvironment(__dirname + "/buidler-project");

    it("should override get-source-paths task", async function() {
      const sourcePaths = await this.env.run(TASK_COMPILE_GET_SOURCE_PATHS);
      assert.lengthOf(sourcePaths, 4);
    });
  });
});
