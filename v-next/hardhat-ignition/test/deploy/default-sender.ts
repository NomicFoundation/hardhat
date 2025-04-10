import type { DeploymentResult } from "@nomicfoundation/ignition-core";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";
import { DeploymentResultType } from "@nomicfoundation/ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("default sender", function () {
  useEphemeralIgnitionProject("minimal");

  it("should throw if default sender is not in configured accounts", async function () {
    await assertRejectsWithHardhatError(
      this.hre.tasks.getTask(["ignition", "deploy"]).run({
        modulePath: "ignition/modules/OwnModule.js",
        defaultSender: "0x1234567890abcdef1234567890abcdef12345678",
      }),
      HardhatError.ERRORS.IGNITION.VALIDATION.INVALID_DEFAULT_SENDER,
      {
        defaultSender: "0x1234567890abcdef1234567890abcdef12345678",
      },
    );
  });

  it("should allow setting default sender via cli", async function () {
    const secondAccountAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    const result: DeploymentResult | null = await this.hre.tasks
      .getTask(["ignition", "deploy"])
      .run({
        modulePath:
          "ignition/modules/RevertWhenDeployedFromFirstAccountModule.js",
        defaultSender: secondAccountAddress,
      });

    assert.isNotNull(result);

    assert.equal(result.type, DeploymentResultType.SUCCESSFUL_DEPLOYMENT);
  });
});
