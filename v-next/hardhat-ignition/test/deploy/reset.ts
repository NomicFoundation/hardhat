import { assertHardhatInvariant } from "@nomicfoundation/hardhat-errors";
import { status } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { HardhatArtifactResolver } from "../../src/helpers/hardhat-artifact-resolver.js";
import { useFileIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("reset flag", function () {
  useFileIgnitionProject("reset-flag", "custom-reset-id");

  before(async function () {
    process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = "false";
    process.env.HARDHAT_IGNITION_CONFIRM_RESET = "false";
  });

  it("should reset a deployment", async function () {
    await this.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/FirstPass.js",
      deploymentId: "custom-reset-id",
      reset: true,
    });

    await this.hre.tasks.getTask(["ignition", "deploy"]).run({
      modulePath: "./ignition/modules/SecondPass.js",
      deploymentId: "custom-reset-id",
      reset: true,
    });

    const artifactResolver = new HardhatArtifactResolver(this.hre.artifacts);

    assertHardhatInvariant(
      this.deploymentDir !== undefined,
      "Deployment dir is undefined",
    );
    const result = await status(this.deploymentDir, artifactResolver);

    // ResetModule#B will only be in the success list if the second
    // run ran without any reconciliation errors - so the retry
    // cleared the first pass
    assert(
      result.successful.includes("ResetModule#B"),
      "Retry did not clear first pass, so second pass failed",
    );
  });
});
