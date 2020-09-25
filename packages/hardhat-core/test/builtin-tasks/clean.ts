import { assert } from "chai";
import fsExtra from "fs-extra";

import { TASK_CLEAN } from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

function assertCleanBehavior() {
  it("Should delete the folders if present", async function () {
    await this.env.run(TASK_CLEAN);

    const cacheContents = fsExtra.readdirSync("./cache");
    assert.isTrue(cacheContents.length === 0);
    assert.isFalse(fsExtra.existsSync("./artifacts"));
  });
}

describe("Clean task", () => {
  useFixtureProject("default-config-project");
  useEnvironment();

  describe("When cache and artifact dirs don't exist", function () {
    beforeEach(() => {
      fsExtra.removeSync("cache");
      fsExtra.removeSync("artifacts");
    });

    assertCleanBehavior();
  });

  describe("When cache and artifact are empty dirs", function () {
    beforeEach(() => {
      fsExtra.emptyDirSync("./cache");
      fsExtra.emptyDirSync("./artifacts");
    });

    assertCleanBehavior();
  });

  describe("When cache and artifact dirs aren't empty", function () {
    beforeEach(() => {
      fsExtra.emptyDirSync("./cache");
      fsExtra.emptyDirSync("./artifacts");
      fsExtra.writeFileSync("./cache/a", "");
      fsExtra.writeFileSync("./artifacts/a", "");
    });

    assertCleanBehavior();
  });
});
