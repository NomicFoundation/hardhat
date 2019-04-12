import { TASK_COMPILE_GET_SOURCE_PATHS } from "@nomiclabs/buidler/builtin-tasks/task-names";
import { OverriddenTaskDefinition } from "@nomiclabs/buidler/internal/core/tasks/task-definitions";
import { assert } from "chai";

import { useEnvironment } from "./helpers";

describe("Plugin task definition", function() {
  before("setup", async function() {
    useEnvironment(__dirname + "/buidler-project");
  });

  it("should override get-source-paths task", async function() {
    assert.instanceOf(
      this.env.tasks[TASK_COMPILE_GET_SOURCE_PATHS],
      OverriddenTaskDefinition
    );
  });

  it("", async function() {});
});
