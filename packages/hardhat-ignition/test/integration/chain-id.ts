import { HardhatError } from "@nomicfoundation/hardhat-errors";
import {
  assertRejectsWithHardhatError,
  createEnvChanges,
} from "@nomicfoundation/hardhat-test-utils";

import { useEphemeralIgnitionProject } from "../test-helpers/use-ignition-project.js";

describe("chainId reconciliation", function () {
  this.timeout(60000);

  useEphemeralIgnitionProject("default-with-new-chain-id");

  // NOTE: This package runs its tests with mocha, so it uses `createEnvChanges`
  // and restores from mocha's own hook, instead of `createTestEnvManager`, which
  // registers a `node:test` one.
  const envChanges = createEnvChanges();

  afterEach(function () {
    envChanges.restoreEnvVars();
  });

  it("should halt when running a deployment on a different chain", async function () {
    envChanges.setEnvVar("HARDHAT_IGNITION_CONFIRM_DEPLOYMENT", "true");

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
  });
});
