import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("strategies - only built in strategies", function () {
  useEphemeralIgnitionProject("minimal");

  it("should throw if a non-recognized strategy is specified", async function () {
    await assert.isRejected(
      this.hre.tasks.getTask(["ignition", "deploy"]).run({
        modulePath: "./ignition/modules/MyModule.js",
        strategy: "non-recognized-strategy",
      }),
      /HHE1703: Invalid strategy name "non-recognized-strategy", must be either 'basic' or 'create2'/,
    );
  });
});
