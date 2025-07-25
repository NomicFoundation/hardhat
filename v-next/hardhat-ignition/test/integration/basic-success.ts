import { assert } from "chai";

import { createHre } from "../test-helpers/create-hre.js";
import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

// This test exists to ensure Ignition succeeds in a CI environment.
// This is a test that the UI, runs even in constrained terminal environments.
// It should always pass locally.
describe("Running deployment in CI environment", function () {
  this.timeout(60000);

  useEphemeralIgnitionProject("ci-success");

  it("should succeed with UI in a CI environment", async function () {
    const hre = await createHre();

    const ignitionTask = hre.tasks.getTask(["ignition", "deploy"]);
    await assert.isFulfilled(
      ignitionTask.run({
        modulePath: "./ignition/modules/LockModule.js",
      }),
    );
  });
});
