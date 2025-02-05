import { status } from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { HardhatArtifactResolver } from "../../src/hardhat-artifact-resolver.js";
import { useFileIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("reset flag", function () {
  useFileIgnitionProject("reset-flag", "custom-reset-id");

  it("should reset a deployment", async function () {
    this.hre.network.name = "something-else";

    await this.hre.run(
      { scope: "ignition", task: "deploy" },
      {
        modulePath: "./ignition/modules/FirstPass.js",
        deploymentId: "custom-reset-id",
        reset: true,
      },
    );

    await this.hre.run(
      { scope: "ignition", task: "deploy" },
      {
        modulePath: "./ignition/modules/SecondPass.js",
        deploymentId: "custom-reset-id",
        reset: true,
      },
    );

    const artifactResolver = new HardhatArtifactResolver(this.hre);
    const result = await status(this.deploymentDir!, artifactResolver);

    // ResetModule#B will only be in the success list if the second
    // run ran without any reconciliation errors - so the retry
    // cleared the first pass
    assert(
      result.successful.includes("ResetModule#B"),
      "Retry did not clear first pass, so second pass failed",
    );
  });
});
