import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertRejectsWithHardhatError } from "@nomicfoundation/hardhat-test-utils";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("chainId reconciliation", function () {
  this.timeout(60000);

  useEphemeralIgnitionProject("default-with-new-chain-id");

  it("should halt when running a deployment on a different chain", async function () {
    process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT = "true";

    await assertRejectsWithHardhatError(
      this.hre.tasks.getTask(["ignition", "deploy"]).run({
        modulePath: "./ignition/modules/LockModule.js",
        deploymentId: "chain-1337",
        writeLocalhostDeployment: true,
      }),
      HardhatError.ERRORS.IGNITION.DEPLOY.CHANGED_CHAINID,
      {
        currentChainId: 1337,
        previousChainId: 123,
      },
    );

    delete process.env.HARDHAT_IGNITION_CONFIRM_DEPLOYMENT;
  });
});
