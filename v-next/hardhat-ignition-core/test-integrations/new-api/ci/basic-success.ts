import { assert } from "chai";

import { useHardhatProject } from "../../helpers/hardhat-projects.js";

// This test exists to ensure Ignition succeeds in a CI environment.
// This is a test that the UI, runs even in constrained terminal environments.
// It should always pass locally.
describe("Running deployment in CI environment", function () {
  this.timeout(60000);

  useHardhatProject("ci-success");

  it("should succeed with UI in a CI environment", async function () {
    await assert.isFulfilled(
      this.hre.run(
        { scope: "ignition", task: "deploy" },
        {
          modulePath: "./ignition/modules/LockModule.js",
        }
      )
    );
  });
});
