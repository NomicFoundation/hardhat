import {
  TASK_NODE,
  TASK_NODE_SERVER_READY,
} from "../../src/builtin-tasks/task-names";
import { useEnvironment } from "../helpers/environment";
import { useFixtureProject } from "../helpers/project";

describe("node task", () => {
  useFixtureProject("default-config-project");
  useEnvironment();

  it("should terminate", async function () {
    this.env.tasks[TASK_NODE_SERVER_READY].setAction(async ({ server }) => {
      server.close();
    });

    await this.env.run(TASK_NODE);
    // NB: If a file watcher persists past this test, then mocha will fail to exit cleanly.
  });
});
