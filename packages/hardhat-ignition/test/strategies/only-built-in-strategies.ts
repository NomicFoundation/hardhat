import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("strategies - only built in strategies", function () {
  useEphemeralIgnitionProject("minimal");

  it("should throw if a non-recognized strategy is specified", async function () {
    await assertRejectsWithHardhatError(
      this.hre.tasks.getTask(["ignition", "deploy"]).run({
        modulePath: "./ignition/modules/MyModule.js",
        strategy: "non-recognized-strategy",
      }),
      HardhatError.ERRORS.IGNITION.STRATEGIES.UNKNOWN_STRATEGY,
      {
        strategyName: "non-recognized-strategy",
      },
    );
  });
});
