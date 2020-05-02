import { assert } from "chai";
import * as fs from "fs";

import { TASK_CLEAN } from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

function assertCleanBehavior() {
  it("Should delete the folders if present", async function () {
    await this.env.run(TASK_CLEAN);

    assert.isFalse(fs.existsSync("./cache"));
    assert.isFalse(fs.existsSync("./artifacts"));
  });
}

describe("Clean task", () => {
  useFixtureProject("default-config-project");
  useEnvironment();

  describe("When cache and artifact dirs don't exist", function () {
    assertCleanBehavior();
  });

  describe("When cache and artifact are empty dirs", function () {
    beforeEach(() => {
      fs.mkdirSync("./cache");
      fs.mkdirSync("./artifacts");
    });

    assertCleanBehavior();
  });

  describe("When cache and artifact dirs aren't empty", function () {
    beforeEach(() => {
      fs.mkdirSync("./cache");
      fs.mkdirSync("./artifacts");
      fs.writeFileSync("./cache/a", "");
      fs.writeFileSync("./artifacts/a", "");
    });

    assertCleanBehavior();
  });
});
