/* eslint-disable import/no-unused-modules */
import type { DeploymentResult } from "@ignored/hardhat-vnext-ignition-core";

import { HardhatError } from "@ignored/hardhat-vnext-errors";
import {
  DeploymentResultType,
  IgnitionError,
} from "@ignored/hardhat-vnext-ignition-core";
import { assert } from "chai";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("default sender", function () {
  useEphemeralIgnitionProject("minimal");

  it("should throw if default sender is not in configured accounts", async function () {
    // TODO: HH3 can this pattern be improved on with utils?
    let threwException = false;
    try {
      await this.hre.tasks.getTask(["ignition", "deploy"]).run({
        modulePath: "ignition/modules/OwnModule.js",
        defaultSender: "0x1234567890abcdef1234567890abcdef12345678",
      });
    } catch (error) {
      threwException = true;

      assert.instanceOf(error, HardhatError);
      assert.isDefined(error.cause);
      assert.instanceOf(error.cause, IgnitionError);
      assert.include(
        error.cause.message,
        "IGN700: Default sender 0x1234567890abcdef1234567890abcdef12345678 is not part of the configured accounts.",
      );
      assert.equal(error.cause.errorNumber, 700);
    }

    assert.isTrue(threwException);
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
