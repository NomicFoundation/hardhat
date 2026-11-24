import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createTestEnvManager,
} from "@nomicfoundation/hardhat-test-utils";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("chainId reconciliation", function () {
  const project = useEphemeralIgnitionProject("default-with-new-chain-id");

  const envChanges = createTestEnvManager();

  it("should halt when running a deployment on a different chain", async function () {
    envChanges.setEnvVar("HARDHAT_IGNITION_CONFIRM_DEPLOYMENT", "true");

    await assertRejectsWithHardhatError(
      project.hre.tasks.getTask(["ignition", "deploy"]).run({
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
  });
});
